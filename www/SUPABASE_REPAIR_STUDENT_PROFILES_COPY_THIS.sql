-- NovaMed student profile sync repair
-- Run this in Supabase > SQL Editor when Profile > Supabase Sync says
-- "student_profiles schema" has a problem, or when progress stays local only.
-- This script keeps your existing rows and adds the columns/policies the app needs.

create extension if not exists pgcrypto;

-- Create the table if it does not exist yet. If it already exists, nothing is deleted.
create table if not exists public.student_profiles (
  id bigserial primary key,
  student_key text,
  full_name text,
  access_code_hash text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add the required columns to old/manual tables such as:
-- id, name, code_hash, xp, watched_videos, mistakes, last_sync.
alter table public.student_profiles add column if not exists student_key text;
alter table public.student_profiles add column if not exists full_name text;
alter table public.student_profiles add column if not exists access_code_hash text;
alter table public.student_profiles add column if not exists profile jsonb not null default '{}'::jsonb;
alter table public.student_profiles add column if not exists created_at timestamptz not null default now();
alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill the new columns from the old/manual columns when they exist.
update public.student_profiles sp
set full_name = coalesce(
  nullif(sp.full_name, ''),
  nullif(to_jsonb(sp)->>'name', ''),
  nullif(to_jsonb(sp)->>'student_name', ''),
  nullif(sp.student_key, ''),
  'Student'
)
where sp.full_name is null or sp.full_name = '';

update public.student_profiles sp
set student_key = coalesce(
  nullif(sp.student_key, ''),
  lower(regexp_replace(trim(coalesce(sp.full_name, to_jsonb(sp)->>'name', sp.id::text, 'student')), '\s+', ' ', 'g'))
)
where sp.student_key is null or sp.student_key = '';

update public.student_profiles sp
set access_code_hash = coalesce(
  nullif(sp.access_code_hash, ''),
  nullif(to_jsonb(sp)->>'code_hash', ''),
  nullif(to_jsonb(sp)->>'accessCodeHash', ''),
  nullif(to_jsonb(sp)->>'codeHash', ''),
  ''
)
where sp.access_code_hash is null or sp.access_code_hash = '';

-- If the old app packed the full profile inside watched_videos.__novamedProfile, restore it.
update public.student_profiles sp
set profile = (to_jsonb(sp)->'watched_videos'->'__novamedProfile')
where (sp.profile is null or sp.profile = '{}'::jsonb)
  and jsonb_typeof(to_jsonb(sp)->'watched_videos'->'__novamedProfile') = 'object';

-- Otherwise create a profile JSON from the old visible columns.
update public.student_profiles sp
set profile = jsonb_strip_nulls(jsonb_build_object(
  'xp', case when coalesce(to_jsonb(sp)->>'xp', '') ~ '^[0-9]+$' then (to_jsonb(sp)->>'xp')::int else 0 end,
  'mistakes', coalesce(to_jsonb(sp)->'mistakes', '[]'::jsonb),
  'videoProgress', coalesce(to_jsonb(sp)->'watched_videos', '{}'::jsonb),
  'updatedAt', coalesce(to_jsonb(sp)->>'last_sync', to_jsonb(sp)->>'updated_at', now()::text)
))
where sp.profile is null or sp.profile = '{}'::jsonb;

-- Remove duplicate keys before adding the unique constraint.
with ranked as (
  select ctid, student_key,
         row_number() over (partition by student_key order by updated_at desc nulls last, created_at desc nulls last, id desc) as rn
  from public.student_profiles
)
update public.student_profiles sp
set student_key = sp.student_key || ' #' || ranked.rn
from ranked
where sp.ctid = ranked.ctid
  and ranked.rn > 1;

alter table public.student_profiles alter column student_key set not null;
alter table public.student_profiles alter column full_name set not null;
alter table public.student_profiles alter column access_code_hash set not null;

create unique index if not exists student_profiles_student_key_key
on public.student_profiles (student_key);

alter table public.student_profiles enable row level security;

drop policy if exists "NovaMed simple profiles read" on public.student_profiles;
drop policy if exists "NovaMed simple profiles write" on public.student_profiles;
drop policy if exists "NovaMed simple profiles insert" on public.student_profiles;
drop policy if exists "NovaMed simple profiles update" on public.student_profiles;

-- This app does not use Supabase Auth. It uses a public anon key plus a name/code hash.
-- These policies allow the static app to read and upsert simple student profiles.
create policy "NovaMed simple profiles read"
on public.student_profiles
for select
to anon, authenticated
using (true);

create policy "NovaMed simple profiles write"
on public.student_profiles
for all
to anon, authenticated
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.student_profiles to anon, authenticated;

notify pgrst, 'reload schema';
