begin;

create policy "users can read own avatar object metadata"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar'
);

commit;
