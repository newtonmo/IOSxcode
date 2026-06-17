-- NOVAMED v142
-- Run this once in Supabase SQL Editor.
-- Goal:
-- 1) Let guests read visible leaderboard rows from student_public.
-- 2) Backfill/sync student_public from profiles + student_state so real students show in Street/Streak.
-- 3) Keep progress high-water safe when multiple devices are used.

alter table if exists public.student_public enable row level security;

-- Public leaderboard read: no email is exposed in this table.
drop policy if exists "student_public_select_visible_anon" on public.student_public;
create policy "student_public_select_visible_anon"
on public.student_public
for select
to anon
using (leaderboard_visible = true);

-- Keep authenticated select policy available too.
drop policy if exists "student_public_select_visible" on public.student_public;
create policy "student_public_select_visible"
on public.student_public
for select
to authenticated
using (leaderboard_visible = true or auth.uid() = user_id);

-- Backfill/sync leaderboard rows from existing real users.
-- This does NOT create fake names. It only uses auth/profiles/student_state rows that already exist.
insert into public.student_public (
  user_id,
  display_name,
  xp,
  streak,
  level,
  leaderboard_visible,
  last_active_at,
  updated_at
)
select
  p.id as user_id,
  coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), split_part(coalesce(p.email, u.email, 'Student'), '@', 1), 'Student') as display_name,
  greatest(coalesce(s.total_xp, 0), coalesce(sp.xp, 0)) as xp,
  greatest(coalesce(s.streak, 0), coalesce(sp.streak, 0)) as streak,
  greatest(1, floor(greatest(coalesce(s.total_xp, 0), coalesce(sp.xp, 0)) / 1000)::int + 1) as level,
  true as leaderboard_visible,
  now() as last_active_at,
  now() as updated_at
from public.profiles p
left join auth.users u on u.id = p.id
left join public.student_state s on s.user_id = p.id
left join public.student_public sp on sp.user_id = p.id
where p.id is not null
on conflict (user_id) do update set
  display_name = excluded.display_name,
  xp = greatest(public.student_public.xp, excluded.xp),
  streak = greatest(public.student_public.streak, excluded.streak),
  level = greatest(public.student_public.level, excluded.level),
  leaderboard_visible = true,
  last_active_at = now(),
  updated_at = now();

-- Optional sanity check: should return only public leaderboard data, no emails.
select display_name, xp, streak, level, leaderboard_visible
from public.student_public
where leaderboard_visible = true
order by xp desc, last_active_at desc
limit 10;
