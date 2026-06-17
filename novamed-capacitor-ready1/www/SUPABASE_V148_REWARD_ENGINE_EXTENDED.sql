-- NovaMed v148 - Secure Reward Engine extension
-- Run this AFTER the phase-1 reward engine was created.
-- It keeps XP/Streak calculation on Supabase and supports the app's real reward events.

create or replace function public.get_reward_xp(p_event_type text)
returns integer
language plpgsql
stable
as $$
begin
  return case p_event_type
    when 'video_completed' then 40
    when 'qbank_correct' then 18
    when 'qbank_wrong' then 6
    when 'qbank_timeout' then 2
    when 'mistake_reviewed' then 3
    when 'flashcard_reviewed' then 1
    when 'route_day_completed' then 25
    when 'lesson_completed' then 25
    when 'daily_streak_claim' then 100
    when 'qbank_attempt_completed' then 5
    when 'daily_activity' then 1
    else 0
  end;
end;
$$;

create or replace function public.award_student_xp(
  p_event_type text,
  p_event_key text,
  p_meta jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  xp_delta integer,
  total_xp integer,
  streak integer,
  level integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_xp_delta integer;
  v_score integer := 0;
  v_old_total_xp integer;
  v_old_streak integer;
  v_old_last_active timestamptz;
  v_new_total_xp integer;
  v_new_streak integer;
  v_new_level integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'Missing event key';
  end if;

  if p_event_type = 'exam_completed' then
    if coalesce(p_meta->>'score', '') ~ '^[0-9]+$' then
      v_score := (p_meta->>'score')::integer;
    end if;
    v_xp_delta := greatest(10, v_score * 12);
  else
    v_xp_delta := public.get_reward_xp(p_event_type);
  end if;

  if v_xp_delta <= 0 then
    raise exception 'Invalid reward event type: %', p_event_type;
  end if;

  insert into public.student_state (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  insert into public.student_public (user_id, display_name)
  values (
    v_user_id,
    coalesce(
      (select display_name from public.profiles where id = v_user_id),
      'Student'
    )
  )
  on conflict (user_id) do nothing;

  select
    coalesce(total_xp, 0),
    coalesce(streak, 0)
  into
    v_old_total_xp,
    v_old_streak
  from public.student_state
  where user_id = v_user_id
  for update;

  select last_active_at
  into v_old_last_active
  from public.student_public
  where user_id = v_user_id
  for update;

  v_new_streak := public.calculate_next_streak(v_old_streak, v_old_last_active);

  insert into public.reward_events (
    user_id,
    event_type,
    event_key,
    xp_delta,
    streak_after,
    total_xp_after,
    meta
  )
  values (
    v_user_id,
    p_event_type,
    p_event_key,
    v_xp_delta,
    v_new_streak,
    v_old_total_xp + v_xp_delta,
    coalesce(p_meta, '{}'::jsonb)
  )
  on conflict (user_id, event_type, event_key)
  do nothing;

  if not found then
    return query
    select
      false,
      0,
      v_old_total_xp,
      v_old_streak,
      coalesce((select sp.level from public.student_public sp where sp.user_id = v_user_id), 1);
    return;
  end if;

  v_new_total_xp := v_old_total_xp + v_xp_delta;
  v_new_level := greatest(1, floor(v_new_total_xp / 100)::integer + 1);

  -- Allow reward columns to be written only inside this SECURITY DEFINER reward path.
  perform set_config('app.reward_write_allowed', 'on', true);

  update public.student_state
  set
    total_xp = v_new_total_xp,
    streak = v_new_streak,
    updated_at = now()
  where user_id = v_user_id;

  update public.student_public
  set
    xp = v_new_total_xp,
    streak = v_new_streak,
    level = v_new_level,
    last_active_at = now(),
    updated_at = now()
  where user_id = v_user_id;

  insert into public.daily_activity (
    user_id,
    activity_date,
    xp_gained,
    meta
  )
  values (
    v_user_id,
    current_date,
    v_xp_delta,
    jsonb_build_object('last_event_type', p_event_type)
  )
  on conflict (user_id, activity_date)
  do update set
    xp_gained = public.daily_activity.xp_gained + excluded.xp_gained,
    meta = public.daily_activity.meta || excluded.meta,
    updated_at = now();

  return query
  select
    true,
    v_xp_delta,
    v_new_total_xp,
    v_new_streak,
    v_new_level;
end;
$$;

revoke all on function public.award_student_xp(text, text, jsonb) from public;
grant execute on function public.award_student_xp(text, text, jsonb) to authenticated;
