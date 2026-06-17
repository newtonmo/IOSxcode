-- NovaMed v147 OPTIONAL admin/content lockdown.
-- Run this ONLY after the Admin account itself is migrated to Supabase Auth
-- and its profiles.role is set to 'admin' or 'owner'.
-- If your Admin is still local Name+Code, running this can stop uploads/content editing.

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

-- Storage bucket: public read, writes only by Supabase-auth admin/owner.
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
