begin;

alter function public.create_calendar_event(text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[])
  set schema private;
alter function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[])
  set schema private;

revoke all on function private.create_calendar_event(text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) from public, anon, authenticated;
revoke all on function private.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) from public, anon, authenticated;

create function public.create_calendar_event(
  event_title text,
  event_description text,
  event_category public.calendar_event_category,
  event_starts_at timestamptz,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[],
  event_ends_at timestamptz default null
)
returns public.calendar_events
language sql
security definer
set search_path = ''
as $$
  select private.create_calendar_event(
    event_title, event_description, event_category, event_starts_at, event_ends_at,
    participant_ids, reminder_presets
  );
$$;

create function public.update_calendar_event(
  target_event_id uuid,
  event_title text,
  event_description text,
  event_category public.calendar_event_category,
  event_starts_at timestamptz,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[],
  event_ends_at timestamptz default null
)
returns public.calendar_events
language sql
security definer
set search_path = ''
as $$
  select private.update_calendar_event(
    target_event_id, event_title, event_description, event_category, event_starts_at,
    event_ends_at, participant_ids, reminder_presets
  );
$$;

revoke all on function public.create_calendar_event(text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) from public;
grant execute on function public.create_calendar_event(text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) to authenticated;
revoke all on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) from public;
grant execute on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) to authenticated;

commit;
