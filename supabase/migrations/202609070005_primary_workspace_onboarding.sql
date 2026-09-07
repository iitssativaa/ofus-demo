begin;

create table private.primary_workspace_config (
  singleton boolean primary key default true check (singleton),
  workspace_id uuid not null unique references public.workspaces(id) on delete restrict,
  configured_at timestamptz not null default now()
);

revoke all on table private.primary_workspace_config from public, anon, authenticated;

create function public.configure_primary_workspace(target_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.workspaces w where w.id = target_workspace_id) then
    raise exception 'Primary workspace does not exist' using errcode = '23503';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id and wm.role = 'owner'
  ) then
    raise exception 'Primary workspace must have an owner' using errcode = '23514';
  end if;

  insert into private.primary_workspace_config (singleton, workspace_id)
  values (true, target_workspace_id)
  on conflict (singleton) do update
    set workspace_id = excluded.workspace_id,
        configured_at = now();

  return target_workspace_id;
end;
$$;

revoke all on function public.configure_primary_workspace(uuid) from public, anon, authenticated;
grant execute on function public.configure_primary_workspace(uuid) to service_role;

create function public.ensure_primary_workspace_membership(configured_primary_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id uuid;
  primary_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select wm.workspace_id
    into existing_workspace_id
    from public.workspace_members wm
   where wm.user_id = current_user_id
   order by wm.joined_at, wm.workspace_id
   limit 1;

  if existing_workspace_id is not null then
    return existing_workspace_id;
  end if;

  select config.workspace_id
    into primary_workspace_id
    from private.primary_workspace_config config
   where config.singleton = true;

  if primary_workspace_id is null then
    raise exception 'Primary workspace is not configured' using errcode = '55000';
  end if;

  if configured_primary_workspace_id is distinct from primary_workspace_id then
    raise exception 'Invalid primary workspace' using errcode = '42501';
  end if;

  if not exists (select 1 from public.workspaces w where w.id = primary_workspace_id) then
    raise exception 'Primary workspace does not exist' using errcode = '23503';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = primary_workspace_id and wm.role = 'owner'
  ) then
    raise exception 'Primary workspace has no owner' using errcode = '23514';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (primary_workspace_id, current_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return primary_workspace_id;
end;
$$;

revoke all on function public.ensure_primary_workspace_membership(uuid) from public, anon;
grant execute on function public.ensure_primary_workspace_membership(uuid) to authenticated;

revoke all on function public.ensure_default_workspace() from public, anon, authenticated;
drop function public.ensure_default_workspace();

drop policy if exists "users can create workspaces" on public.workspaces;
revoke insert on table public.workspaces from authenticated;

commit;
