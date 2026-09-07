begin;

update public.workspaces
set name = 'OfUs'
where name = 'TwoOfUs';

create or replace function public.ensure_default_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select wm.workspace_id into existing_workspace_id
  from public.workspace_members wm
  where wm.user_id = current_user_id
  order by wm.joined_at
  limit 1;

  if existing_workspace_id is not null then return existing_workspace_id; end if;

  insert into public.workspaces (name, created_by)
  values ('OfUs', current_user_id)
  returning id into existing_workspace_id;

  return existing_workspace_id;
end;
$$;

revoke all on function public.ensure_default_workspace() from public;
grant execute on function public.ensure_default_workspace() to authenticated;

commit;
