begin;

create or replace function public.update_calendar_event(
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
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.calendar_events
    where id = target_event_id and is_routine_occurrence and private.is_workspace_member(workspace_id)
  ) then
    raise exception 'Routine occurrences must be edited through their routine' using errcode = 'P0001';
  end if;
  return private.update_calendar_event(
    target_event_id, event_title, event_description, event_category, event_starts_at,
    event_ends_at, participant_ids, reminder_presets
  );
end;
$$;

alter function public.delete_calendar_event(uuid) set schema private;
revoke all on function private.delete_calendar_event(uuid) from public, anon, authenticated;

create function public.delete_calendar_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.calendar_events
    where id = target_event_id and is_routine_occurrence and private.is_workspace_member(workspace_id)
  ) then
    raise exception 'Routine occurrences must be deleted through their routine' using errcode = 'P0001';
  end if;
  perform private.delete_calendar_event(target_event_id);
end;
$$;

revoke all on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) from public;
grant execute on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, uuid[], public.reminder_preset[], timestamptz) to authenticated;
revoke all on function public.delete_calendar_event(uuid) from public;
grant execute on function public.delete_calendar_event(uuid) to authenticated;

commit;
