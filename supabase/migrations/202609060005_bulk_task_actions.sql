alter table public.task_activities
add column request_id uuid;

create unique index task_activities_workspace_request_unique
on public.task_activities(workspace_id, request_id)
where request_id is not null;

create function public.apply_bulk_task_action(
  target_task_id uuid,
  action_type text,
  action_request_id uuid,
  target_assignee_id uuid default null,
  target_due_at timestamptz default null,
  target_status public.task_status default null,
  target_priority public.task_priority default null,
  target_cancellation_reason public.cancellation_reason default null,
  target_cancellation_note text default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_task public.tasks;
  updated_task public.tasks;
  activity_event_type text;
  activity_description text;
  activity_metadata jsonb := '{}'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if action_request_id is null then
    raise exception 'İşlem kimliği zorunludur.';
  end if;

  select * into selected_task
  from public.tasks
  where id = target_task_id
  for update;

  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Görev bulunamadı.';
  end if;

  if exists (
    select 1 from public.task_activities
    where workspace_id = selected_task.workspace_id
      and request_id = action_request_id
      and actor_id = (select auth.uid())
  ) then
    return selected_task;
  end if;

  if selected_task.status in ('completed', 'cancelled') then
    raise exception 'Arşivlenmiş görevler toplu olarak değiştirilemez.';
  end if;

  case action_type
    when 'assignee' then
      if target_assignee_id is null or not exists (
        select 1 from public.workspace_members
        where workspace_id = selected_task.workspace_id
          and user_id = target_assignee_id
      ) then
        raise exception 'Seçilen sorumlu çalışma alanı üyesi değil.';
      end if;
      update public.tasks set assignee_id = target_assignee_id
      where id = selected_task.id and workspace_id = selected_task.workspace_id
      returning * into updated_task;
      activity_event_type := 'assignee_changed';
      activity_description := 'Sorumlu değiştirildi';
      activity_metadata := jsonb_build_object('assignee_id', target_assignee_id);

    when 'due_date' then
      if target_due_at is null then raise exception 'Geçerli bir son tarih seçmelisiniz.'; end if;
      update public.tasks set due_at = target_due_at
      where id = selected_task.id and workspace_id = selected_task.workspace_id
      returning * into updated_task;
      activity_event_type := 'due_date_changed';
      activity_description := 'Son tarih güncellendi';
      activity_metadata := jsonb_build_object('due_at', target_due_at);

    when 'status' then
      if target_status is null or target_status not in ('todo', 'in_progress', 'waiting', 'review') then
        raise exception 'Bu durum toplu işlem için kullanılamaz.';
      end if;
      update public.tasks set status = target_status
      where id = selected_task.id and workspace_id = selected_task.workspace_id
      returning * into updated_task;
      activity_event_type := 'status_changed';
      activity_description := 'Durum değiştirildi';
      activity_metadata := jsonb_build_object('status', target_status);

    when 'priority' then
      if target_priority is null then raise exception 'Geçerli bir öncelik seçmelisiniz.'; end if;
      update public.tasks set priority = target_priority
      where id = selected_task.id and workspace_id = selected_task.workspace_id
      returning * into updated_task;
      activity_event_type := 'priority_changed';
      activity_description := 'Öncelik değiştirildi';
      activity_metadata := jsonb_build_object('priority', target_priority);

    when 'cancel' then
      if target_cancellation_reason is null then raise exception 'İptal nedeni seçmelisiniz.'; end if;
      update public.tasks set
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = target_cancellation_reason,
        cancellation_note = nullif(btrim(target_cancellation_note), ''),
        completed_at = null,
        result_note = null,
        completion_note = null
      where id = selected_task.id and workspace_id = selected_task.workspace_id
      returning * into updated_task;
      activity_event_type := 'task_cancelled';
      activity_description := 'Görev iptal edildi';
      activity_metadata := jsonb_build_object('reason', target_cancellation_reason);

    else
      raise exception 'Desteklenmeyen toplu işlem.';
  end case;

  insert into public.task_activities (
    workspace_id,
    task_id,
    entity_id,
    actor_id,
    event_type,
    description,
    metadata,
    request_id
  ) values (
    selected_task.workspace_id,
    selected_task.id,
    selected_task.id,
    (select auth.uid()),
    activity_event_type,
    activity_description,
    activity_metadata,
    action_request_id
  );

  return updated_task;
end;
$$;

revoke all on function public.apply_bulk_task_action(
  uuid,
  text,
  uuid,
  uuid,
  timestamptz,
  public.task_status,
  public.task_priority,
  public.cancellation_reason,
  text
) from public;

grant execute on function public.apply_bulk_task_action(
  uuid,
  text,
  uuid,
  uuid,
  timestamptz,
  public.task_status,
  public.task_priority,
  public.cancellation_reason,
  text
) to authenticated;
