-- NovaMed student profile sync fix
-- Use this when:
-- 1) student_profiles does not exist,
-- 2) you created it manually with columns like name/code_hash/xp,
-- 3) RLS blocks the app, or
-- 4) the second browser creates a new local account instead of restoring progress.
--
-- Run this inside Supabase > SQL Editor, then reload the app and open Profile > Supabase Sync > Check again.

create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  id text primary key default gen_random_uuid()::text,
  student_key text unique,
  full_name text,
  access_code_hash text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If you previously made id as SERIAL/integer, convert it to text because the app uses stable text ids.
do $$
declare
  id_type text;
begin
  select data_type into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'student_profiles'
    and column_name = 'id';

  if id_type is not null and id_type <> 'text' then
    execute 'alter table public.student_profiles alter column id drop default';
    execute 'alter table public.student_profiles alter column id type text using id::text';
  end if;
end $$;

alter table public.student_profiles
  alter column id set default gen_random_uuid()::text;

alter table public.student_profiles add column if not exists student_key text;
alter table public.student_profiles add column if not exists full_name text;
alter table public.student_profiles add column if not exists access_code_hash text;
alter table public.student_profiles add column if not exists profile jsonb not null default '{}'::jsonb;
alter table public.student_profiles add column if not exists created_at timestamptz not null default now();
alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill rows made with the earlier/manual table shape: name, code_hash, xp, watched_videos, mistakes, last_sync.
update public.student_profiles sp
set full_name = coalesce(
  nullif(sp.full_name, ''),
  nullif(to_jsonb(sp)->>'name', ''),
  nullif(to_jsonb(sp)->>'student_name', ''),
  nullif(sp.student_key, ''),
  'Student'
);

update public.student_profiles sp
set student_key = coalesce(
  nullif(sp.student_key, ''),
  lower(regexp_replace(trim(coalesce(sp.full_name, to_jsonb(sp)->>'name', sp.id, 'student')), '\s+', ' ', 'g'))
);

update public.student_profiles sp
set access_code_hash = coalesce(
  nullif(sp.access_code_hash, ''),
  nullif(to_jsonb(sp)->>'code_hash', ''),
  nullif(to_jsonb(sp)->>'accessCodeHash', ''),
  nullif(to_jsonb(sp)->>'codeHash', ''),
  ''
);

update public.student_profiles sp
set profile = case
  when sp.profile is null or sp.profile = '{}'::jsonb then
    jsonb_strip_nulls(jsonb_build_object(
      'xp', case when coalesce(to_jsonb(sp)->>'xp', '') ~ '^[0-9]+$' then (to_jsonb(sp)->>'xp')::int else 0 end,
      'mistakes', coalesce(to_jsonb(sp)->'mistakes', '[]'::jsonb),
      'videosWatched', coalesce(to_jsonb(sp)->'watched_videos', '{}'::jsonb),
      'videoProgress', coalesce(to_jsonb(sp)->'video_progress', '{}'::jsonb),
      'qbankStats', coalesce(to_jsonb(sp)->'qbank_stats', '{}'::jsonb),
      'qbankAttempts', coalesce(to_jsonb(sp)->'qbank_attempts', '[]'::jsonb),
      'updatedAt', coalesce(to_jsonb(sp)->>'last_sync', to_jsonb(sp)->>'updated_at', now()::text)
    ))
  else sp.profile
end;

-- Avoid duplicate student_key values before the unique index is made.
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

-- The app does NOT use Supabase Auth; it uses a public anon key and a name+code hash.
-- These policies allow the static app to select/upsert simple profiles.
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
