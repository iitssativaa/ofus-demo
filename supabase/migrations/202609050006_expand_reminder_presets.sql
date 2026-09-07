alter type public.reminder_preset add value if not exists 'one_hour_before';
alter type public.reminder_preset add value if not exists 'six_hours_before';
alter type public.reminder_preset add value if not exists 'three_days_before';
alter type public.reminder_preset add value if not exists 'five_days_before';

begin;

alter table public.task_reminders
  drop constraint task_reminders_preset_offset_consistency,
  add constraint task_reminders_preset_offset_consistency check (
    (preset = 'one_hour_before' and offset_minutes = -60)
    or (preset = 'six_hours_before' and offset_minutes = -360)
    or (preset = 'one_day_before' and offset_minutes = -1440)
    or (preset = 'three_days_before' and offset_minutes = -4320)
    or (preset = 'five_days_before' and offset_minutes = -7200)
    or (preset = 'three_hours_before' and offset_minutes = -180)
    or (preset = 'at_deadline' and offset_minutes = 0)
  );

create or replace function public.set_task_reminders(
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
      when 'one_hour_before' then -60
      when 'six_hours_before' then -360
      when 'one_day_before' then -1440
      when 'three_days_before' then -4320
      when 'five_days_before' then -7200
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

commit;
