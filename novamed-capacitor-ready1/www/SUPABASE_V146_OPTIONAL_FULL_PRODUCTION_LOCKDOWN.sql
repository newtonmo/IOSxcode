-- NovaMed v146 OPTIONAL full production lockdown.
-- Run this ONLY after you migrate the Admin account itself to Supabase Auth and set profiles.role='admin' or 'owner'.
-- If you run it while Admin is still local Name+Code, content editing/video uploads may stop working.

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

-- Storage bucket read stays public; writes become authenticated-admin only.
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

revoke delete on public.novamed_content from anon, authenticated;
notify pgrst, 'reload schema';
