begin;

alter function public.create_calendar_routine(text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[])
  set schema private;
alter function public.update_calendar_routine(uuid, text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[])
  set schema private;

revoke all on function private.create_calendar_routine(text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) from public, anon, authenticated;
revoke all on function private.update_calendar_routine(uuid, text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) from public, anon, authenticated;

create function public.create_calendar_routine(
  routine_title text,
  routine_category public.calendar_event_category,
  routine_start_time time,
  routine_recurrence_type public.calendar_routine_recurrence,
  routine_starts_on date,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[],
  routine_description text default '',
  routine_end_time time default null,
  routine_recurrence_interval integer default 1,
  routine_days_of_week smallint[] default '{}',
  routine_day_of_month smallint default null,
  routine_ends_on date default null
)
returns public.calendar_routines
language sql
security definer
set search_path = ''
as $$
  select private.create_calendar_routine(
    routine_title, routine_description, routine_category, routine_start_time, routine_end_time,
    routine_recurrence_type, routine_recurrence_interval, routine_days_of_week, routine_day_of_month,
    routine_starts_on, routine_ends_on, participant_ids, reminder_presets
  );
$$;

create function public.update_calendar_routine(
  target_routine_id uuid,
  routine_title text,
  routine_category public.calendar_event_category,
  routine_start_time time,
  routine_recurrence_type public.calendar_routine_recurrence,
  routine_starts_on date,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[],
  routine_description text default '',
  routine_end_time time default null,
  routine_recurrence_interval integer default 1,
  routine_days_of_week smallint[] default '{}',
  routine_day_of_month smallint default null,
  routine_ends_on date default null
)
returns public.calendar_routines
language sql
security definer
set search_path = ''
as $$
  select private.update_calendar_routine(
    target_routine_id, routine_title, routine_description, routine_category, routine_start_time, routine_end_time,
    routine_recurrence_type, routine_recurrence_interval, routine_days_of_week, routine_day_of_month,
    routine_starts_on, routine_ends_on, participant_ids, reminder_presets
  );
$$;

revoke all on function public.create_calendar_routine(text, public.calendar_event_category, time, public.calendar_routine_recurrence, date, uuid[], public.reminder_preset[], text, time, integer, smallint[], smallint, date) from public;
grant execute on function public.create_calendar_routine(text, public.calendar_event_category, time, public.calendar_routine_recurrence, date, uuid[], public.reminder_preset[], text, time, integer, smallint[], smallint, date) to authenticated;
revoke all on function public.update_calendar_routine(uuid, text, public.calendar_event_category, time, public.calendar_routine_recurrence, date, uuid[], public.reminder_preset[], text, time, integer, smallint[], smallint, date) from public;
grant execute on function public.update_calendar_routine(uuid, text, public.calendar_event_category, time, public.calendar_routine_recurrence, date, uuid[], public.reminder_preset[], text, time, integer, smallint[], smallint, date) to authenticated;

commit;
