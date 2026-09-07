begin;

create type public.resource_link_type as enum ('drive', 'figma', 'github', 'vercel', 'document', 'other');

create table public.resource_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  project_id uuid,
  task_id uuid,
  title text not null check (length(btrim(title)) > 0),
  url text not null check (url ~* '^https?://[^[:space:]]+$'),
  type public.resource_link_type not null default 'other',
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_links_exactly_one_owner check (num_nonnulls(company_id, project_id, task_id) = 1),
  constraint resource_links_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete cascade,
  constraint resource_links_project_workspace_fk foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete cascade,
  constraint resource_links_task_workspace_fk foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade,
  constraint resource_links_creator_membership_fk foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id) on delete no action
);

create index resource_links_company_idx on public.resource_links(workspace_id, company_id) where company_id is not null;
create index resource_links_project_idx on public.resource_links(workspace_id, project_id) where project_id is not null;
create index resource_links_task_idx on public.resource_links(workspace_id, task_id) where task_id is not null;

create trigger resource_links_set_updated_at before update on public.resource_links
for each row execute function private.set_updated_at();

alter table public.resource_links enable row level security;
create policy "members can manage workspace resource links" on public.resource_links
for all to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

revoke all on public.resource_links from anon;
grant select, insert, update, delete on public.resource_links to authenticated;

commit;
