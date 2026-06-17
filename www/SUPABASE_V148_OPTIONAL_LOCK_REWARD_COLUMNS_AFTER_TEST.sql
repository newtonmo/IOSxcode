-- NovaMed v148 OPTIONAL final reward lock
-- Run this ONLY after the v148 app is uploaded and tested.
-- It blocks direct browser updates to XP/Streak/Level and forces rewards through award_student_xp().

create or replace function public.block_direct_reward_column_updates()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.reward_write_allowed', true) = 'on' then
    return new;
  end if;

  if tg_table_name = 'student_state' then
    if new.total_xp is distinct from old.total_xp
       or new.streak is distinct from old.streak then
      raise exception 'Direct XP/Streak updates are blocked. Use award_student_xp RPC.';
    end if;
  end if;

  if tg_table_name = 'student_public' then
    if new.xp is distinct from old.xp
       or new.streak is distinct from old.streak
       or new.level is distinct from old.level then
      raise exception 'Direct leaderboard reward updates are blocked. Use award_student_xp RPC.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists block_student_state_reward_updates on public.student_state;
create trigger block_student_state_reward_updates
before update on public.student_state
for each row
execute function public.block_direct_reward_column_updates();

drop trigger if exists block_student_public_reward_updates on public.student_public;
create trigger block_student_public_reward_updates
before update on public.student_public
for each row
execute function public.block_direct_reward_column_updates();
