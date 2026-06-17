-- NovaMed v147 - Email OTP signup + email/password sign-in + full student RLS cleanup
-- Use this with the v147 app. This does NOT use hidden/generated emails and does NOT use Name+Code login.
-- Required Supabase settings:
-- Authentication > Providers > Email: Enable Email provider + Enable sign ups.
-- Authentication > Email Templates: Magic Link/OTP and Confirm Signup should show {{ .Token }} if you want numeric OTP emails.
-- SMTP can be configured if Supabase requires template editing.

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

-- -------------------------
-- 1) Private profile: each auth user owns exactly one row.
-- -------------------------
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

create unique index if not exists profiles_email_unique_lower
on public.profiles (lower(email)) where email is not null;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -------------------------
-- 2) Private student state: safe high-level progress and UI state.
-- -------------------------
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

-- -------------------------
-- 3) Public leaderboard card: no email/private fields here. Guests may read visible rows only.
-- -------------------------
create table if not exists public.student_public (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  avatar_url text,
  xp integer not null default 0,
  streak integer not null default 0,
  level integer not null default 1,
  leaderboard_visible boolean not null default true,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_public add column if not exists display_name text not null default 'Student';
alter table public.student_public add column if not exists avatar_url text;
alter table public.student_public add column if not exists xp integer not null default 0;
alter table public.student_public add column if not exists streak integer not null default 0;
alter table public.student_public add column if not exists level integer not null default 1;
alter table public.student_public add column if not exists leaderboard_visible boolean not null default true;
alter table public.student_public add column if not exists last_active_at timestamptz not null default now();
alter table public.student_public add column if not exists created_at timestamptz not null default now();
alter table public.student_public add column if not exists updated_at timestamptz not null default now();

create index if not exists student_public_leaderboard_idx
on public.student_public (leaderboard_visible, xp desc, last_active_at desc);

drop trigger if exists set_student_public_updated_at on public.student_public;
create trigger set_student_public_updated_at
before update on public.student_public
for each row execute function public.set_updated_at();

-- -------------------------
-- 4) Separated progress tables used by the current app.
-- -------------------------
create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_key text not null,
  course text,
  chapter text,
  lecture text,
  video_title text,
  current_time_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  progress_percent numeric not null default 0,
  completed boolean not null default false,
  notes jsonb not null default '[]'::jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  last_watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, video_key)
);

create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  source_key text,
  title text,
  body text,
  timestamp_seconds numeric,
  tags jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qbank_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text,
  course text,
  chapter text,
  lecture text,
  question_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  score_percent numeric not null default 0,
  duration_seconds integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.question_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  course text,
  chapter text,
  lecture text,
  question jsonb not null default '{}'::jsonb,
  selected_answer text,
  correct_answer text,
  explanation text,
  status text not null default 'active',
  times_wrong integer not null default 1,
  last_wrong_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, question_key)
);

create table if not exists public.flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_key text not null,
  course text,
  chapter text,
  lecture text,
  ease text,
  review_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, card_key)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Study Plan',
  plan_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_state jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_key text not null,
  title text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_type, source_key)
);

create table if not exists public.student_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area text,
  query text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  xp_gained integer not null default 0,
  videos_completed integer not null default 0,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  study_minutes integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_date)
);

-- Useful indexes.
create index if not exists video_progress_user_updated_idx on public.video_progress(user_id, updated_at desc);
create index if not exists student_notes_user_source_idx on public.student_notes(user_id, source_type, source_key, created_at desc);
create index if not exists qbank_attempts_user_created_idx on public.qbank_attempts(user_id, created_at desc);
create index if not exists question_mistakes_user_updated_idx on public.question_mistakes(user_id, updated_at desc);
create index if not exists flashcard_progress_user_review_idx on public.flashcard_progress(user_id, next_review_at, updated_at desc);
create index if not exists study_plans_user_active_idx on public.study_plans(user_id, active, updated_at desc);
create index if not exists live_exams_user_status_idx on public.live_exams(user_id, status, updated_at desc);
create index if not exists student_bookmarks_user_source_idx on public.student_bookmarks(user_id, source_type, source_key);
create index if not exists student_search_history_user_created_idx on public.student_search_history(user_id, created_at desc);
create index if not exists daily_activity_user_date_idx on public.daily_activity(user_id, activity_date desc);

-- Add/update triggers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'video_progress','student_notes','question_mistakes','flashcard_progress',
    'study_plans','live_exams','student_bookmarks','daily_activity'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_' || t || '_updated_at', t);
  end loop;
end $$;

-- -------------------------
-- 5) RLS cleanup.
-- -------------------------
alter table public.profiles enable row level security;
alter table public.student_state enable row level security;
alter table public.student_public enable row level security;
alter table public.video_progress enable row level security;
alter table public.student_notes enable row level security;
alter table public.qbank_attempts enable row level security;
alter table public.question_mistakes enable row level security;
alter table public.flashcard_progress enable row level security;
alter table public.study_plans enable row level security;
alter table public.live_exams enable row level security;
alter table public.student_bookmarks enable row level security;
alter table public.student_search_history enable row level security;
alter table public.daily_activity enable row level security;

-- Remove old/prototype policy names that can conflict or leave open access.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Private owner-only tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'student_state','video_progress','student_notes','qbank_attempts','question_mistakes',
    'flashcard_progress','study_plans','live_exams','student_bookmarks','student_search_history','daily_activity'
  ] loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using (user_id = auth.uid())', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check (user_id = auth.uid())', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using (user_id = auth.uid())', t, t);
  end loop;
end $$;

-- Public leaderboard: anon sees only visible rows, authenticated users can also see/update their own row.
drop policy if exists "student_public_select_visible_anon" on public.student_public;
drop policy if exists "student_public_select_visible" on public.student_public;
drop policy if exists "student_public_insert_own" on public.student_public;
drop policy if exists "student_public_update_own" on public.student_public;
drop policy if exists "student_public_delete_own" on public.student_public;

create policy "student_public_select_visible_anon" on public.student_public
for select to anon using (leaderboard_visible = true);
create policy "student_public_select_visible" on public.student_public
for select to authenticated using (leaderboard_visible = true or user_id = auth.uid());
create policy "student_public_insert_own" on public.student_public
for insert to authenticated with check (user_id = auth.uid());
create policy "student_public_update_own" on public.student_public
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "student_public_delete_own" on public.student_public
for delete to authenticated using (user_id = auth.uid());

-- Grants: RLS still controls row access.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.student_state to authenticated;
grant select on public.student_public to anon;
grant select, insert, update, delete on public.student_public to authenticated;
grant select, insert, update, delete on public.video_progress to authenticated;
grant select, insert, update, delete on public.student_notes to authenticated;
grant select, insert, update, delete on public.qbank_attempts to authenticated;
grant select, insert, update, delete on public.question_mistakes to authenticated;
grant select, insert, update, delete on public.flashcard_progress to authenticated;
grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.live_exams to authenticated;
grant select, insert, update, delete on public.student_bookmarks to authenticated;
grant select, insert, delete on public.student_search_history to authenticated;
grant select, insert, update, delete on public.daily_activity to authenticated;

-- Lock old prototype Name+Code table if it exists. The v147 app no longer uses it.
do $$
begin
  if to_regclass('public.student_profiles') is not null then
    execute 'alter table public.student_profiles enable row level security';
    execute 'drop policy if exists "NovaMed simple profiles read" on public.student_profiles';
    execute 'drop policy if exists "NovaMed simple profiles write" on public.student_profiles';
    execute 'drop policy if exists "NovaMed simple profiles insert" on public.student_profiles';
    execute 'drop policy if exists "NovaMed simple profiles update" on public.student_profiles';
    execute 'revoke all on public.student_profiles from anon';
    execute 'revoke delete on public.student_profiles from authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';
