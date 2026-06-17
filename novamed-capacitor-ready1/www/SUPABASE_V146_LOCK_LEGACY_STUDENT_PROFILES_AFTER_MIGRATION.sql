-- NovaMed v146 - Lock legacy student_profiles after migration.
-- Run this after you confirm that old Name+Code students can sign in once with v146
-- and their progress appears in profiles/student_state/student_public.

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
