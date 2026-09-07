begin;

create type public.reminder_preset as enum (
  'one_day_before',
  'three_hours_before',
  'at_deadline'
);

alter table public.task_reminders
  add column preset public.reminder_preset;

update public.task_reminders
   set preset = case offset_minutes
     when -1440 then 'one_day_before'::public.reminder_preset
     when -180 then 'three_hours_before'::public.reminder_preset
     when 0 then 'at_deadline'::public.reminder_preset
   end;

alter table public.task_reminders
  alter column preset set not null,
  add constraint task_reminders_preset_offset_consistency check (
    (preset = 'one_day_before' and offset_minutes = -1440)
    or (preset = 'three_hours_before' and offset_minutes = -180)
    or (preset = 'at_deadline' and offset_minutes = 0)
  );

create function public.set_task_reminders(
  target_task_id uuid,
  reminder_presets public.reminder_preset[]
)
returns setof public.task_reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks%rowtype;
  selected_preset public.reminder_preset;
  selected_offset integer;
  normalized_presets public.reminder_preset[];
begin
  select * into selected_task
    from public.tasks
   where id = target_task_id
   for update;

  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct value order by value), '{}'::public.reminder_preset[])
    into normalized_presets
    from unnest(coalesce(reminder_presets, '{}'::public.reminder_preset[])) as value;

  if cardinality(normalized_presets) > 0 and (selected_task.due_at is null or selected_task.assignee_id is null) then
    raise exception 'Task due date and assignee are required for reminders' using errcode = '23514';
  end if;

  if selected_task.status in ('completed', 'cancelled') and cardinality(normalized_presets) > 0 then
    raise exception 'Closed tasks cannot have pending reminders' using errcode = '23514';
  end if;

  update public.task_reminders
     set status = 'cancelled', last_error = null
   where task_id = selected_task.id
     and status <> 'sent'
     and not (preset = any(normalized_presets));

  foreach selected_preset in array normalized_presets loop
    selected_offset := case selected_preset
      when 'one_day_before' then -1440
      when 'three_hours_before' then -180
      when 'at_deadline' then 0
    end;

    insert into public.task_reminders (
      workspace_id, task_id, user_id, channel, preset, offset_minutes, remind_at
    ) values (
      selected_task.workspace_id,
      selected_task.id,
      selected_task.assignee_id,
      'telegram',
      selected_preset,
      selected_offset,
      selected_task.due_at + make_interval(mins => selected_offset)
    )
    on conflict (task_id, user_id, channel, offset_minutes) do update
      set preset = excluded.preset,
          remind_at = excluded.remind_at,
          status = case when public.task_reminders.status = 'sent' then 'sent'::public.reminder_status else 'pending'::public.reminder_status end,
          attempt_count = case when public.task_reminders.status = 'sent' then public.task_reminders.attempt_count else 0 end,
          last_attempt_at = case when public.task_reminders.status = 'sent' then public.task_reminders.last_attempt_at else null end,
          last_error = null;
  end loop;

  return query
    select reminder.*
      from public.task_reminders reminder
     where reminder.task_id = selected_task.id
       and reminder.status <> 'cancelled'
     order by reminder.offset_minutes;
end;
$$;

revoke all on function public.set_task_reminders(uuid, public.reminder_preset[]) from public;
grant execute on function public.set_task_reminders(uuid, public.reminder_preset[]) to authenticated;

comment on column public.task_reminders.preset is
  'Stable preset identifier; offset_minutes remains the execution-ready offset used to calculate remind_at.';

commit;
