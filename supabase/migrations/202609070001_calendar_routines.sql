begin;

create type public.calendar_routine_recurrence as enum ('daily', 'weekly', 'monthly');

create table public.calendar_routines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 500),
  description text check (description is null or char_length(description) <= 20000),
  category public.calendar_event_category not null,
  start_time time not null,
  end_time time,
  recurrence_type public.calendar_routine_recurrence not null,
  recurrence_interval integer not null default 1 check (recurrence_interval between 1 and 365),
  days_of_week smallint[],
  day_of_month smallint,
  starts_on date not null,
  ends_on date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint calendar_routines_time_order check (end_time is null or end_time > start_time),
  constraint calendar_routines_date_order check (ends_on is null or ends_on >= starts_on),
  constraint calendar_routines_weekdays check (
    (recurrence_type = 'weekly' and cardinality(days_of_week) > 0 and days_of_week <@ array[1,2,3,4,5,6,7]::smallint[])
    or (recurrence_type <> 'weekly' and coalesce(cardinality(days_of_week), 0) = 0)
  ),
  constraint calendar_routines_month_day check (
    (recurrence_type = 'monthly' and day_of_month between 1 and 31)
    or (recurrence_type <> 'monthly' and day_of_month is null)
  )
);

create table public.calendar_routine_participants (
  routine_id uuid not null,
  workspace_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (routine_id, user_id),
  constraint calendar_routine_participants_routine_fk foreign key (routine_id, workspace_id)
    references public.calendar_routines(id, workspace_id) on delete cascade,
  constraint calendar_routine_participants_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade
);

create table public.calendar_routine_reminder_presets (
  routine_id uuid not null,
  workspace_id uuid not null,
  preset public.reminder_preset not null,
  created_at timestamptz not null default now(),
  primary key (routine_id, preset),
  constraint calendar_routine_presets_routine_fk foreign key (routine_id, workspace_id)
    references public.calendar_routines(id, workspace_id) on delete cascade,
  constraint calendar_routine_presets_supported check (preset in ('one_hour_before', 'six_hours_before', 'one_day_before', 'three_days_before', 'five_days_before'))
);

alter table public.calendar_events
  add column routine_id uuid references public.calendar_routines(id) on delete set null,
  add column routine_occurrence_date date,
  add column is_routine_occurrence boolean not null default false,
  add constraint calendar_events_routine_source_check check (
    (is_routine_occurrence and routine_occurrence_date is not null)
    or (not is_routine_occurrence and routine_id is null and routine_occurrence_date is null)
  );

create unique index calendar_events_active_routine_occurrence_idx
  on public.calendar_events(routine_id, routine_occurrence_date)
  where routine_id is not null and deleted_at is null;
create index calendar_routines_workspace_active_idx on public.calendar_routines(workspace_id, is_active, starts_on);
create index calendar_routine_participants_user_idx on public.calendar_routine_participants(workspace_id, user_id);

create trigger calendar_routines_set_updated_at before update on public.calendar_routines
for each row execute function private.set_updated_at();

create function private.sync_calendar_routine_configuration(
  selected_routine public.calendar_routines,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_id uuid;
  selected_preset public.reminder_preset;
  normalized_participants uuid[];
  normalized_presets public.reminder_preset[];
begin
  select coalesce(array_agg(distinct value order by value), '{}'::uuid[])
    into normalized_participants from unnest(coalesce(participant_ids, '{}'::uuid[])) value;
  select coalesce(array_agg(distinct value order by value), '{}'::public.reminder_preset[])
    into normalized_presets from unnest(coalesce(reminder_presets, '{}'::public.reminder_preset[])) value;

  if cardinality(normalized_participants) = 0 then
    raise exception 'At least one participant is required' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(normalized_participants) member_id
    where not exists (
      select 1 from public.workspace_members
      where workspace_id = selected_routine.workspace_id and user_id = member_id
    )
  ) then
    raise exception 'Participant is not a workspace member' using errcode = '23503';
  end if;
  if exists (
    select 1 from unnest(normalized_presets) preset
    where preset not in ('one_hour_before', 'six_hours_before', 'one_day_before', 'three_days_before', 'five_days_before')
  ) then
    raise exception 'Unsupported calendar reminder preset' using errcode = '22023';
  end if;

  delete from public.calendar_routine_participants where routine_id = selected_routine.id;
  foreach participant_id in array normalized_participants loop
    insert into public.calendar_routine_participants(routine_id, workspace_id, user_id)
    values (selected_routine.id, selected_routine.workspace_id, participant_id);
  end loop;

  delete from public.calendar_routine_reminder_presets where routine_id = selected_routine.id;
  foreach selected_preset in array normalized_presets loop
    insert into public.calendar_routine_reminder_presets(routine_id, workspace_id, preset)
    values (selected_routine.id, selected_routine.workspace_id, selected_preset);
  end loop;
end;
$$;

create function private.clear_future_calendar_routine_occurrences(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calendar_event_reminders reminder
     set status = 'cancelled', last_error = null
    from public.calendar_events event
   where event.routine_id = target_routine_id
     and event.starts_at >= now()
     and event.deleted_at is null
     and reminder.event_id = event.id
     and reminder.status <> 'sent';

  delete from public.calendar_event_participants participant
  using public.calendar_events event
  where event.routine_id = target_routine_id
    and event.starts_at >= now()
    and event.deleted_at is null
    and participant.event_id = event.id;

  update public.calendar_events
     set deleted_at = now()
   where routine_id = target_routine_id
     and starts_at >= now()
     and deleted_at is null;
end;
$$;

create function private.materialize_calendar_routine(target_routine_id uuid, horizon_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_routine public.calendar_routines%rowtype;
  occurrence_date date;
  generated_event public.calendar_events%rowtype;
  participant_ids uuid[];
  reminder_presets public.reminder_preset[];
  generated_count integer := 0;
begin
  select * into selected_routine from public.calendar_routines where id = target_routine_id;
  if selected_routine.id is null or not selected_routine.is_active then return 0; end if;

  select coalesce(array_agg(user_id order by user_id), '{}'::uuid[])
    into participant_ids from public.calendar_routine_participants where routine_id = selected_routine.id;
  select coalesce(array_agg(preset order by preset), '{}'::public.reminder_preset[])
    into reminder_presets from public.calendar_routine_reminder_presets where routine_id = selected_routine.id;

  for occurrence_date in
    select candidate::date
    from generate_series(
      greatest(selected_routine.starts_on, current_date)::timestamp,
      least(coalesce(selected_routine.ends_on, current_date + greatest(1, least(horizon_days, 365))), current_date + greatest(1, least(horizon_days, 365)))::timestamp,
      interval '1 day'
    ) candidate
    where case selected_routine.recurrence_type
      when 'daily' then ((candidate::date - selected_routine.starts_on) % selected_routine.recurrence_interval) = 0
      when 'weekly' then extract(isodow from candidate)::smallint = any(selected_routine.days_of_week)
        and (((candidate::date - selected_routine.starts_on) / 7) % selected_routine.recurrence_interval) = 0
      when 'monthly' then extract(day from candidate)::smallint = selected_routine.day_of_month
        and (((extract(year from candidate)::integer - extract(year from selected_routine.starts_on)::integer) * 12
          + extract(month from candidate)::integer - extract(month from selected_routine.starts_on)::integer) % selected_routine.recurrence_interval) = 0
    end
  loop
    generated_event := null;
    insert into public.calendar_events(
      workspace_id, title, description, category, starts_at, ends_at, created_by,
      routine_id, routine_occurrence_date, is_routine_occurrence
    ) values (
      selected_routine.workspace_id, selected_routine.title, selected_routine.description, selected_routine.category,
      (occurrence_date + selected_routine.start_time) at time zone 'Europe/Istanbul',
      case when selected_routine.end_time is null then null else (occurrence_date + selected_routine.end_time) at time zone 'Europe/Istanbul' end,
      selected_routine.created_by, selected_routine.id, occurrence_date, true
    ) on conflict (routine_id, routine_occurrence_date) where routine_id is not null and deleted_at is null do nothing
    returning * into generated_event;

    if generated_event.id is not null then
      perform private.sync_calendar_event_configuration(generated_event, participant_ids, reminder_presets);
      generated_count := generated_count + 1;
    end if;
  end loop;
  return generated_count;
end;
$$;

create function public.materialize_calendar_routine_occurrences(horizon_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  routine record;
  total integer := 0;
begin
  for routine in select id from public.calendar_routines where is_active loop
    total := total + private.materialize_calendar_routine(routine.id, horizon_days);
  end loop;
  return total;
end;
$$;

create function public.create_calendar_routine(
  routine_title text,
  routine_description text,
  routine_category public.calendar_event_category,
  routine_start_time time,
  routine_end_time time,
  routine_recurrence_type public.calendar_routine_recurrence,
  routine_recurrence_interval integer,
  routine_days_of_week smallint[],
  routine_day_of_month smallint,
  routine_starts_on date,
  routine_ends_on date,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[]
)
returns public.calendar_routines
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workspace_id uuid;
  created_routine public.calendar_routines%rowtype;
begin
  select workspace_id into target_workspace_id from public.workspace_members
   where user_id = (select auth.uid()) order by joined_at limit 1;
  if target_workspace_id is null or not private.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace not found' using errcode = 'P0002';
  end if;
  insert into public.calendar_routines(
    workspace_id, title, description, category, start_time, end_time, recurrence_type,
    recurrence_interval, days_of_week, day_of_month, starts_on, ends_on, created_by
  ) values (
    target_workspace_id, btrim(routine_title), nullif(btrim(coalesce(routine_description, '')), ''), routine_category,
    routine_start_time, routine_end_time, routine_recurrence_type, coalesce(routine_recurrence_interval, 1),
    case when routine_recurrence_type = 'weekly' then routine_days_of_week else null end,
    case when routine_recurrence_type = 'monthly' then routine_day_of_month else null end,
    routine_starts_on, routine_ends_on, (select auth.uid())
  ) returning * into created_routine;
  perform private.sync_calendar_routine_configuration(created_routine, participant_ids, reminder_presets);
  perform private.materialize_calendar_routine(created_routine.id, 90);
  return created_routine;
end;
$$;

create function public.update_calendar_routine(
  target_routine_id uuid,
  routine_title text,
  routine_description text,
  routine_category public.calendar_event_category,
  routine_start_time time,
  routine_end_time time,
  routine_recurrence_type public.calendar_routine_recurrence,
  routine_recurrence_interval integer,
  routine_days_of_week smallint[],
  routine_day_of_month smallint,
  routine_starts_on date,
  routine_ends_on date,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[]
)
returns public.calendar_routines
language plpgsql
security definer
set search_path = ''
as $$
declare updated_routine public.calendar_routines%rowtype;
begin
  if not exists (select 1 from public.calendar_routines where id = target_routine_id and private.is_workspace_member(workspace_id)) then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;
  perform private.clear_future_calendar_routine_occurrences(target_routine_id);
  update public.calendar_routines set
    title = btrim(routine_title), description = nullif(btrim(coalesce(routine_description, '')), ''), category = routine_category,
    start_time = routine_start_time, end_time = routine_end_time, recurrence_type = routine_recurrence_type,
    recurrence_interval = coalesce(routine_recurrence_interval, 1),
    days_of_week = case when routine_recurrence_type = 'weekly' then routine_days_of_week else null end,
    day_of_month = case when routine_recurrence_type = 'monthly' then routine_day_of_month else null end,
    starts_on = routine_starts_on, ends_on = routine_ends_on
  where id = target_routine_id and private.is_workspace_member(workspace_id)
  returning * into updated_routine;
  if updated_routine.id is null then raise exception 'Routine not found' using errcode = 'P0002'; end if;
  perform private.sync_calendar_routine_configuration(updated_routine, participant_ids, reminder_presets);
  if updated_routine.is_active then perform private.materialize_calendar_routine(updated_routine.id, 90); end if;
  return updated_routine;
end;
$$;

create function public.set_calendar_routine_active(target_routine_id uuid, active boolean)
returns public.calendar_routines
language plpgsql
security definer
set search_path = ''
as $$
declare updated_routine public.calendar_routines%rowtype;
begin
  if not exists (select 1 from public.calendar_routines where id = target_routine_id and private.is_workspace_member(workspace_id)) then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;
  if not coalesce(active, false) then perform private.clear_future_calendar_routine_occurrences(target_routine_id); end if;
  update public.calendar_routines set is_active = coalesce(active, false)
   where id = target_routine_id and private.is_workspace_member(workspace_id)
   returning * into updated_routine;
  if updated_routine.id is null then raise exception 'Routine not found' using errcode = 'P0002'; end if;
  if updated_routine.is_active then perform private.materialize_calendar_routine(updated_routine.id, 90); end if;
  return updated_routine;
end;
$$;

create function public.delete_calendar_routine(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.calendar_routines where id = target_routine_id and private.is_workspace_member(workspace_id)) then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;
  perform private.clear_future_calendar_routine_occurrences(target_routine_id);
  delete from public.calendar_routines where id = target_routine_id;
end;
$$;

alter table public.calendar_routines enable row level security;
alter table public.calendar_routine_participants enable row level security;
alter table public.calendar_routine_reminder_presets enable row level security;

create policy "members can view calendar routines" on public.calendar_routines
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can view calendar routine participants" on public.calendar_routine_participants
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can view calendar routine reminder presets" on public.calendar_routine_reminder_presets
for select to authenticated using (private.is_workspace_member(workspace_id));

revoke all on public.calendar_routines, public.calendar_routine_participants, public.calendar_routine_reminder_presets from anon;
revoke all on public.calendar_routines, public.calendar_routine_participants, public.calendar_routine_reminder_presets from authenticated;
grant select on public.calendar_routines, public.calendar_routine_participants, public.calendar_routine_reminder_presets to authenticated;

revoke all on function private.sync_calendar_routine_configuration(public.calendar_routines, uuid[], public.reminder_preset[]) from public, anon, authenticated;
revoke all on function private.clear_future_calendar_routine_occurrences(uuid) from public, anon, authenticated;
revoke all on function private.materialize_calendar_routine(uuid, integer) from public, anon, authenticated;
revoke all on function public.materialize_calendar_routine_occurrences(integer) from public, anon, authenticated;
grant execute on function public.materialize_calendar_routine_occurrences(integer) to service_role;
revoke all on function public.create_calendar_routine(text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) from public;
grant execute on function public.create_calendar_routine(text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) to authenticated;
revoke all on function public.update_calendar_routine(uuid, text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) from public;
grant execute on function public.update_calendar_routine(uuid, text, text, public.calendar_event_category, time, time, public.calendar_routine_recurrence, integer, smallint[], smallint, date, date, uuid[], public.reminder_preset[]) to authenticated;
revoke all on function public.set_calendar_routine_active(uuid, boolean) from public;
grant execute on function public.set_calendar_routine_active(uuid, boolean) to authenticated;
revoke all on function public.delete_calendar_routine(uuid) from public;
grant execute on function public.delete_calendar_routine(uuid) to authenticated;

commit;
