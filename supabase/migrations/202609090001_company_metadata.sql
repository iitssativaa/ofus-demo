begin;

alter table public.companies
  add column logo_url text,
  add column linkedin_url text;

comment on column public.companies.logo_url is
  'Durable object path in the private company-logos bucket; never a signed URL.';

alter table public.companies
  add constraint companies_linkedin_url_check check (
    linkedin_url is null or (
      length(linkedin_url) <= 2048
      and linkedin_url ~* '^https?://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$'
      and linkedin_url !~ '[[:cntrl:]\\]'
    )
  ),
  add constraint companies_logo_path_check check (
    logo_url is null or (
      split_part(logo_url, '/', 1) = workspace_id::text
      and split_part(logo_url, '/', 2) = id::text
      and logo_url ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Invoker rights preserve company RLS; no user-controlled UUID casts.
create function private.can_access_company_logo(object_name text)
returns boolean
language sql stable
set search_path = ''
as $$
  select object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.companies c
      where c.workspace_id::text = split_part(object_name, '/', 1)
        and c.id::text = split_part(object_name, '/', 2)
        and private.is_workspace_member(c.workspace_id)
    );
$$;

revoke all on function private.can_access_company_logo(text) from public, anon;
grant execute on function private.can_access_company_logo(text) to authenticated;

create policy "members can read company logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'company-logos' and private.can_access_company_logo(name));
create policy "members can upload company logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-logos' and private.can_access_company_logo(name));
create policy "members can replace company logos" on storage.objects
  for update to authenticated
  using (bucket_id = 'company-logos' and private.can_access_company_logo(name))
  with check (bucket_id = 'company-logos' and private.can_access_company_logo(name));
create policy "members can remove company logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-logos' and private.can_access_company_logo(name));

commit;
