-- NovaMed v145 production RLS hardening
-- Run this only when you use Supabase Auth email/password student accounts.
-- It intentionally blocks the old public anon name+code student_profiles flow because anon-write
-- cannot be made secure in a static frontend.

-- PUBLIC CONTENT: everyone can read published app content; only authenticated admins can write.
alter table if exists public.novamed_content enable row level security;
drop policy if exists "NovaMed public content read" on public.novamed_content;
drop policy if exists "NovaMed prototype content write" on public.novamed_content;
drop policy if exists "NovaMed authenticated admin content write" on public.novamed_content;
create policy "NovaMed public content read"
on public.novamed_content
for select
to anon, authenticated
using (true);
create policy "NovaMed authenticated admin content write"
on public.novamed_content
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, 'student') in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, 'student') in ('admin', 'owner')
  )
);

-- AUTH PROFILES: each authenticated user can read/update their own row.
alter table if exists public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
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

-- PRIVATE STUDENT PROGRESS: only owner can read/write.
alter table if exists public.student_state enable row level security;
drop policy if exists "student_state_select_own" on public.student_state;
drop policy if exists "student_state_insert_own" on public.student_state;
drop policy if exists "student_state_update_own" on public.student_state;
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

-- PUBLIC LEADERBOARD: guests can read only visible leaderboard fields; owner can maintain own row.
alter table if exists public.student_public enable row level security;
drop policy if exists "student_public_select_visible_anon" on public.student_public;
drop policy if exists "student_public_select_visible" on public.student_public;
drop policy if exists "student_public_insert_own" on public.student_public;
drop policy if exists "student_public_update_own" on public.student_public;
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

-- LEGACY SIMPLE LOGIN TABLE: lock down anon access. Keep only if you still need migration reads in SQL editor.
alter table if exists public.student_profiles enable row level security;
drop policy if exists "NovaMed simple profiles read" on public.student_profiles;
drop policy if exists "NovaMed simple profiles write" on public.student_profiles;
drop policy if exists "NovaMed simple profiles insert" on public.student_profiles;
drop policy if exists "NovaMed simple profiles update" on public.student_profiles;
revoke all on public.student_profiles from anon;
revoke delete on public.student_profiles from authenticated;

-- STORAGE: public read for course assets; writes only for authenticated admins.
drop policy if exists "NovaMed public storage read" on storage.objects;
drop policy if exists "NovaMed prototype storage upload" on storage.objects;
drop policy if exists "NovaMed authenticated admin storage write" on storage.objects;
create policy "NovaMed public storage read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'novamed');
create policy "NovaMed authenticated admin storage write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'novamed'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, 'student') in ('admin', 'owner')
  )
)
with check (
  bucket_id = 'novamed'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, 'student') in ('admin', 'owner')
  )
);

notify pgrst, 'reload schema';
