-- NovaMed v146 - Student Name+Code backed by Supabase Auth + strong student RLS
-- Run this in Supabase SQL Editor after uploading/testing the v146 app.
-- Required Auth setting before testing the hidden Name+Code login:
-- Authentication > Providers > Email: Enable Email provider + Enable sign ups + DISABLE email confirmation.
-- Why disable confirmation? The app creates a hidden deterministic email for Name+Code accounts;
-- there is no real inbox for that generated email.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Auth profile row, owned by auth.users.id.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2) Private student progress. Only the authenticated owner can read/write it.
create table if not exists public.student_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  streak integer not null default 0,
  theme text not null default 'dark',
  last_route text,
  ui_state jsonb not null default '{}'::jsonb,
  daily_todo jsonb,
  learn_route jsonb,
  feature_state jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_state add column if not exists total_xp integer not null default 0;
alter table public.student_state add column if not exists streak integer not null default 0;
alter table public.student_state add column if not exists theme text not null default 'dark';
alter table public.student_state add column if not exists last_route text;
alter table public.student_state add column if not exists ui_state jsonb not null default '{}'::jsonb;
alter table public.student_state add column if not exists daily_todo jsonb;
alter table public.student_state add column if not exists learn_route jsonb;
alter table public.student_state add column if not exists feature_state jsonb not null default '{}'::jsonb;
alter table public.student_state add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.student_state add column if not exists created_at timestamptz not null default now();
alter table public.student_state add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_student_state_updated_at on public.student_state;
create trigger set_student_state_updated_at
before update on public.student_state
for each row execute function public.set_updated_at();

-- 3) Public leaderboard row. Guests can see only rows marked visible.
create table if not exists public.student_public (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  xp integer not null default 0,
  streak integer not null default 0,
  level integer not null default 1,
  leaderboard_visible boolean not null default true,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_public add column if not exists display_name text not null default 'Student';
alter table public.student_public add column if not exists xp integer not null default 0;
alter table public.student_public add column if not exists streak integer not null default 0;
alter table public.student_public add column if not exists level integer not null default 1;
alter table public.student_public add column if not exists leaderboard_visible boolean not null default true;
alter table public.student_public add column if not exists last_active_at timestamptz not null default now();
alter table public.student_public add column if not exists created_at timestamptz not null default now();
alter table public.student_public add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_student_public_updated_at on public.student_public;
create trigger set_student_public_updated_at
before update on public.student_public
for each row execute function public.set_updated_at();

-- 4) Turn on RLS and remove old/open prototype policies from student-owned data.
alter table public.profiles enable row level security;
alter table public.student_state enable row level security;
alter table public.student_public enable row level security;

-- Profiles policies.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Private progress policies.
drop policy if exists "student_state_select_own" on public.student_state;
drop policy if exists "student_state_insert_own" on public.student_state;
drop policy if exists "student_state_update_own" on public.student_state;
drop policy if exists "student_state_delete_own" on public.student_state;
create policy "student_state_select_own"
on public.student_state
for select
to authenticated
using (user_id = auth.uid());
create policy "student_state_insert_own"
on public.student_state
for insert
to authenticated
with check (user_id = auth.uid());
create policy "student_state_update_own"
on public.student_state
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Public leaderboard policies.
drop policy if exists "student_public_select_visible_anon" on public.student_public;
drop policy if exists "student_public_select_visible" on public.student_public;
drop policy if exists "student_public_insert_own" on public.student_public;
drop policy if exists "student_public_update_own" on public.student_public;
drop policy if exists "student_public_delete_own" on public.student_public;
create policy "student_public_select_visible_anon"
on public.student_public
for select
to anon
using (leaderboard_visible = true);
create policy "student_public_select_visible"
on public.student_public
for select
to authenticated
using (leaderboard_visible = true or user_id = auth.uid());
create policy "student_public_insert_own"
on public.student_public
for insert
to authenticated
with check (user_id = auth.uid());
create policy "student_public_update_own"
on public.student_public
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 5) Legacy simple-login table migration note.
-- This schema/RLS file intentionally does NOT lock public.student_profiles yet.
-- Reason: v146 can migrate an old Name+Code profile into the new auth.uid() tables
-- when the student logs in for the first time. After you confirm migration works,
-- run SUPABASE_V146_LOCK_LEGACY_STUDENT_PROFILES_AFTER_MIGRATION.sql to fully close it.

-- Minimal grants. RLS still decides which rows are visible/writable.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.student_state to authenticated;
grant select on public.student_public to anon;
grant select, insert, update on public.student_public to authenticated;

-- IMPORTANT:
-- This file secures the new Auth-backed student data. Lock the old student_profiles table after migration.
-- It does NOT lock novamed_content/storage uploads because your current Admin login is still local Name+Code.
-- If you lock content/storage to authenticated admin before migrating Admin to Supabase Auth,
-- video/QBank upload tools may stop working. Use the optional full-production file only after admin migration.

notify pgrst, 'reload schema';
