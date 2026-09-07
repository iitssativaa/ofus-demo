begin;

create schema if not exists private;

create type public.workspace_role as enum ('owner', 'member');
create type public.project_status as enum ('active', 'on_hold', 'wrapping_up');
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'review', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_size as enum ('s', 'm', 'l', 'xl');
create type public.cancellation_reason as enum ('client_cancelled', 'no_longer_needed', 'merged', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  contact_name text,
  phone text,
  email text,
  website text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  status public.project_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_company_workspace_fk foreign key (company_id, workspace_id)
    references public.companies(id, workspace_id) on delete no action,
  unique (id, workspace_id),
  unique (id, workspace_id, company_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null,
  project_id uuid not null,
  assignee_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  size public.task_size not null default 'm',
  due_at timestamptz,
  tags text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  notes text,
  completed_at timestamptz,
  delivered boolean not null default false,
  feedback_received boolean not null default false,
  revisions_completed boolean not null default false,
  successfully_closed boolean not null default false,
  result_note text,
  completion_note text,
  cancelled_at timestamptz,
  cancellation_reason public.cancellation_reason,
  cancellation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_project_workspace_company_fk foreign key (project_id, workspace_id, company_id)
    references public.projects(id, workspace_id, company_id) on delete no action,
  constraint tasks_assignee_membership_fk foreign key (workspace_id, assignee_id)
    references public.workspace_members(workspace_id, user_id) on delete no action,
  constraint tasks_lifecycle_consistency check (
    (status = 'completed' and completed_at is not null and length(btrim(result_note)) > 0 and cancelled_at is null and cancellation_reason is null)
    or
    (status = 'cancelled' and cancelled_at is not null and cancellation_reason is not null and completed_at is null)
    or
    (status not in ('completed', 'cancelled') and completed_at is null and cancelled_at is null and cancellation_reason is null)
  ),
  unique (id, workspace_id)
);

create table public.task_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (length(btrim(event_type)) > 0),
  description text not null check (length(btrim(description)) > 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint task_activities_task_workspace_fk foreign key (task_id, workspace_id)
    references public.tasks(id, workspace_id) on delete cascade
);

create index workspace_members_user_idx on public.workspace_members(user_id);
create index companies_workspace_idx on public.companies(workspace_id);
create index projects_workspace_company_idx on public.projects(workspace_id, company_id);
create index tasks_workspace_status_idx on public.tasks(workspace_id, status);
create index tasks_workspace_due_idx on public.tasks(workspace_id, due_at);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index task_activities_task_created_idx on public.task_activities(task_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Yeni kullanıcı'
    )
  );
  return new;
end;
$$;

create function private.add_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger companies_set_updated_at before update on public.companies
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function private.set_updated_at();
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();
create trigger on_workspace_created after insert on public.workspaces
for each row execute function private.add_workspace_owner();

create function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

create function private.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

create function private.shares_workspace(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = (select auth.uid()) or exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user_id
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_owner(uuid) to authenticated;
grant execute on function private.shares_workspace(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_activities enable row level security;

create policy "profiles visible to shared workspace members" on public.profiles
for select to authenticated using (private.shares_workspace(id));
create policy "users can insert own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "users can update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "members can view workspaces" on public.workspaces
for select to authenticated using (private.is_workspace_member(id));
create policy "users can create workspaces" on public.workspaces
for insert to authenticated with check (created_by = (select auth.uid()));
create policy "owners can update workspaces" on public.workspaces
for update to authenticated using (private.is_workspace_owner(id)) with check (private.is_workspace_owner(id));
create policy "owners can delete workspaces" on public.workspaces
for delete to authenticated using (private.is_workspace_owner(id));

create policy "members can view workspace membership" on public.workspace_members
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "owners can add workspace members" on public.workspace_members
for insert to authenticated with check (private.is_workspace_owner(workspace_id));
create policy "owners can update workspace members" on public.workspace_members
for update to authenticated using (private.is_workspace_owner(workspace_id)) with check (private.is_workspace_owner(workspace_id));
create policy "owners can remove workspace members" on public.workspace_members
for delete to authenticated using (private.is_workspace_owner(workspace_id));

create policy "members can manage companies" on public.companies
for all to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy "members can manage projects" on public.projects
for all to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy "members can manage tasks" on public.tasks
for all to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy "members can manage task activities" on public.task_activities
for all to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

revoke all on public.profiles, public.workspaces, public.workspace_members, public.companies, public.projects, public.tasks, public.task_activities from anon;
grant select, insert, update, delete on public.profiles, public.workspaces, public.workspace_members, public.companies, public.projects, public.tasks, public.task_activities to authenticated;

commit;
