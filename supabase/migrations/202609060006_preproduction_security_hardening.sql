begin;

create function private.preserve_workspace_owned_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'Workspace identity cannot be changed' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Creator identity cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_preserve_identity before update on public.companies
for each row execute function private.preserve_workspace_owned_identity();
create trigger projects_preserve_identity before update on public.projects
for each row execute function private.preserve_workspace_owned_identity();
create trigger tasks_preserve_identity before update on public.tasks
for each row execute function private.preserve_workspace_owned_identity();
create trigger resource_links_preserve_identity before update on public.resource_links
for each row execute function private.preserve_workspace_owned_identity();
create trigger mushroom_board_notes_preserve_identity before update on public.mushroom_board_notes
for each row execute function private.preserve_workspace_owned_identity();

create function private.enforce_task_lifecycle_entrypoints()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'cancelled')
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Archived tasks are read-only' using errcode = '42501';
  end if;
  if old.status not in ('completed', 'cancelled')
     and new.status in ('completed', 'cancelled')
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Use the formal task lifecycle action' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tasks_enforce_lifecycle_entrypoints before update on public.tasks
for each row execute function private.enforce_task_lifecycle_entrypoints();

drop policy "members can manage companies" on public.companies;
create policy "members can read companies" on public.companies
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can create companies" on public.companies
for insert to authenticated with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);
create policy "members can update companies" on public.companies
for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));
create policy "members can delete companies" on public.companies
for delete to authenticated using (private.is_workspace_member(workspace_id));

drop policy "members can manage projects" on public.projects;
create policy "members can read projects" on public.projects
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can create projects" on public.projects
for insert to authenticated with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);
create policy "members can update projects" on public.projects
for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));
create policy "members can delete projects" on public.projects
for delete to authenticated using (private.is_workspace_member(workspace_id));

drop policy "members can manage tasks" on public.tasks;
create policy "members can read tasks" on public.tasks
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can create active tasks" on public.tasks
for insert to authenticated with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
  and status in ('todo', 'in_progress', 'waiting', 'review')
  and completed_at is null
  and cancelled_at is null
  and cancellation_reason is null
);
create policy "members can update tasks" on public.tasks
for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

drop policy "members can manage task activities" on public.task_activities;
create policy "members can read task activities" on public.task_activities
for select to authenticated using (private.is_workspace_member(workspace_id));

revoke insert, update, delete on public.task_activities from authenticated;
grant select on public.task_activities to authenticated;
revoke delete on public.tasks from authenticated;

drop policy "members can manage workspace resource links" on public.resource_links;
create policy "members can read workspace resource links" on public.resource_links
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can create workspace resource links" on public.resource_links
for insert to authenticated with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);
create policy "members can update workspace resource links" on public.resource_links
for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));
create policy "members can delete workspace resource links" on public.resource_links
for delete to authenticated using (private.is_workspace_member(workspace_id));

alter table public.resource_links drop constraint resource_links_url_check;
alter table public.resource_links add constraint resource_links_url_check check (
  char_length(url) between 10 and 2048
  and url ~* '^https?://[a-z0-9][a-z0-9.-]*(\:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
);

drop policy "workspace members can create mushroom board notes" on public.mushroom_board_notes;
revoke insert on public.mushroom_board_notes from authenticated;
alter function public.create_mushroom_board_note(uuid, text, date, smallint, uuid) security definer;

create function public.create_task_activity(
  target_task_id uuid,
  target_event_type text,
  target_description text,
  target_metadata jsonb default '{}'::jsonb,
  action_request_id uuid default gen_random_uuid()
)
returns public.task_activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks;
  created_activity public.task_activities;
begin
  select * into selected_task from public.tasks where id = target_task_id;
  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if target_event_type not in (
    'task_created', 'task_updated', 'assignee_changed', 'due_date_changed',
    'status_changed', 'priority_changed', 'project_changed', 'reminders_updated',
    'checklist_updated', 'note_updated'
  ) then
    raise exception 'Unsupported activity type' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(target_description, ''))) not between 1 and 500 then
    raise exception 'Invalid activity description' using errcode = '23514';
  end if;
  if jsonb_typeof(coalesce(target_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid activity metadata' using errcode = '23514';
  end if;

  insert into public.task_activities (
    workspace_id, task_id, entity_id, actor_id, event_type, description, metadata, request_id
  ) values (
    selected_task.workspace_id, selected_task.id, selected_task.id, (select auth.uid()),
    target_event_type, btrim(target_description), coalesce(target_metadata, '{}'::jsonb), action_request_id
  )
  on conflict (workspace_id, request_id) where request_id is not null do nothing
  returning * into created_activity;

  if created_activity.id is null then
    select * into created_activity from public.task_activities
    where workspace_id = selected_task.workspace_id
      and request_id = action_request_id
      and actor_id = (select auth.uid());
  end if;
  return created_activity;
end;
$$;

create function public.complete_task_secure(
  target_task_id uuid,
  target_completed_at timestamptz,
  target_delivered boolean,
  target_feedback_received boolean,
  target_revisions_completed boolean,
  target_successfully_closed boolean,
  target_result_note text,
  target_completion_note text,
  action_request_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks;
  updated_task public.tasks;
begin
  select * into selected_task from public.tasks where id = target_task_id for update;
  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.task_activities where workspace_id = selected_task.workspace_id and request_id = action_request_id and actor_id = (select auth.uid())) then
    return selected_task;
  end if;
  if selected_task.status in ('completed', 'cancelled') then
    raise exception 'Task is already archived' using errcode = '23514';
  end if;
  if target_completed_at is null or char_length(btrim(coalesce(target_result_note, ''))) = 0 then
    raise exception 'Completion date and result are required' using errcode = '23514';
  end if;

  update public.tasks set
    status = 'completed', completed_at = target_completed_at,
    delivered = target_delivered, feedback_received = target_feedback_received,
    revisions_completed = target_revisions_completed, successfully_closed = target_successfully_closed,
    result_note = btrim(target_result_note), completion_note = nullif(btrim(coalesce(target_completion_note, '')), ''),
    cancelled_at = null, cancellation_reason = null, cancellation_note = null
  where id = selected_task.id and workspace_id = selected_task.workspace_id
  returning * into updated_task;

  insert into public.task_activities (
    workspace_id, task_id, entity_id, actor_id, event_type, description, metadata, request_id
  ) values (
    selected_task.workspace_id, selected_task.id, selected_task.id, (select auth.uid()),
    'task_completed', 'Görev tamamlandı', '{}'::jsonb, action_request_id
  );
  return updated_task;
end;
$$;

create function public.cancel_task_secure(
  target_task_id uuid,
  target_cancellation_reason public.cancellation_reason,
  target_cancellation_note text,
  action_request_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks;
  updated_task public.tasks;
begin
  select * into selected_task from public.tasks where id = target_task_id for update;
  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.task_activities where workspace_id = selected_task.workspace_id and request_id = action_request_id and actor_id = (select auth.uid())) then
    return selected_task;
  end if;
  if selected_task.status in ('completed', 'cancelled') or target_cancellation_reason is null then
    raise exception 'Task cannot be cancelled' using errcode = '23514';
  end if;

  update public.tasks set
    status = 'cancelled', cancelled_at = now(), cancellation_reason = target_cancellation_reason,
    cancellation_note = nullif(btrim(coalesce(target_cancellation_note, '')), ''),
    completed_at = null, result_note = null, completion_note = null
  where id = selected_task.id and workspace_id = selected_task.workspace_id
  returning * into updated_task;

  insert into public.task_activities (
    workspace_id, task_id, entity_id, actor_id, event_type, description, metadata, request_id
  ) values (
    selected_task.workspace_id, selected_task.id, selected_task.id, (select auth.uid()),
    'task_cancelled', 'Görev iptal edildi', jsonb_build_object('reason', target_cancellation_reason), action_request_id
  );
  return updated_task;
end;
$$;

create function public.delete_mistaken_task(target_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks;
begin
  select * into selected_task from public.tasks where id = target_task_id for update;
  if selected_task.id is null
     or not private.is_workspace_member(selected_task.workspace_id)
     or selected_task.created_by is distinct from (select auth.uid())
     or selected_task.status in ('completed', 'cancelled') then
    raise exception 'Task not found or cannot be permanently deleted' using errcode = '42501';
  end if;
  delete from public.tasks where id = selected_task.id and workspace_id = selected_task.workspace_id;
end;
$$;

alter function public.apply_bulk_task_action(
  uuid, text, uuid, uuid, timestamptz, public.task_status,
  public.task_priority, public.cancellation_reason, text
) security definer;

revoke all on function public.create_task_activity(uuid, text, text, jsonb, uuid) from public;
grant execute on function public.create_task_activity(uuid, text, text, jsonb, uuid) to authenticated;
revoke all on function public.complete_task_secure(uuid, timestamptz, boolean, boolean, boolean, boolean, text, text, uuid) from public;
grant execute on function public.complete_task_secure(uuid, timestamptz, boolean, boolean, boolean, boolean, text, text, uuid) to authenticated;
revoke all on function public.cancel_task_secure(uuid, public.cancellation_reason, text, uuid) from public;
grant execute on function public.cancel_task_secure(uuid, public.cancellation_reason, text, uuid) to authenticated;
revoke all on function public.delete_mistaken_task(uuid) from public;
grant execute on function public.delete_mistaken_task(uuid) to authenticated;

commit;
