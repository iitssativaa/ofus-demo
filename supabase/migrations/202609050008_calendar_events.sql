begin;

create type public.calendar_event_category as enum ('work', 'social');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  category public.calendar_event_category not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_order check (ends_at is null or ends_at > starts_at),
  unique (id, workspace_id)
);

create table public.calendar_event_participants (
  event_id uuid not null,
  workspace_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id),
  constraint calendar_event_participants_event_fk foreign key (event_id, workspace_id)
    references public.calendar_events(id, workspace_id) on delete cascade,
  constraint calendar_event_participants_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade
);

create table public.calendar_event_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  user_id uuid not null,
  channel public.reminder_channel not null default 'telegram',
  preset public.reminder_preset not null,
  offset_minutes integer not null check (offset_minutes in (-7200, -4320, -1440, -360, -60)),
  remind_at timestamptz not null,
  status public.reminder_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  last_attempt_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_reminders_event_fk foreign key (event_id, workspace_id)
    references public.calendar_events(id, workspace_id) on delete cascade,
  constraint calendar_event_reminders_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade,
  constraint calendar_event_reminders_preset_offset check (
    (preset = 'one_hour_before' and offset_minutes = -60)
    or (preset = 'six_hours_before' and offset_minutes = -360)
    or (preset = 'one_day_before' and offset_minutes = -1440)
    or (preset = 'three_days_before' and offset_minutes = -4320)
    or (preset = 'five_days_before' and offset_minutes = -7200)
  ),
  unique (event_id, user_id, channel, offset_minutes)
);

create table public.calendar_event_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  reminder_id uuid not null references public.calendar_event_reminders(id) on delete cascade,
  user_id uuid not null,
  channel public.reminder_channel not null,
  status public.notification_delivery_status not null,
  attempt_number integer not null check (attempt_number between 1 and 3),
  provider_message_id text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  constraint calendar_event_deliveries_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade,
  unique (reminder_id, attempt_number)
);

create index calendar_events_workspace_start_idx on public.calendar_events(workspace_id, starts_at) where deleted_at is null;
create index calendar_event_participants_user_idx on public.calendar_event_participants(workspace_id, user_id);
create index calendar_event_reminders_due_idx on public.calendar_event_reminders(remind_at, last_attempt_at) where status in ('pending', 'failed');
create index calendar_event_reminders_event_idx on public.calendar_event_reminders(workspace_id, event_id);

create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function private.set_updated_at();
create trigger calendar_event_reminders_set_updated_at before update on public.calendar_event_reminders
for each row execute function private.set_updated_at();

create function private.sync_calendar_event_configuration(
  selected_event public.calendar_events,
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
  selected_offset integer;
  normalized_participants uuid[];
  normalized_presets public.reminder_preset[];
begin
  select coalesce(array_agg(distinct value order by value), '{}'::uuid[])
    into normalized_participants
    from unnest(coalesce(participant_ids, '{}'::uuid[])) as value;
  select coalesce(array_agg(distinct value order by value), '{}'::public.reminder_preset[])
    into normalized_presets
    from unnest(coalesce(reminder_presets, '{}'::public.reminder_preset[])) as value;

  if cardinality(normalized_participants) = 0 then
    raise exception 'At least one participant is required' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(normalized_participants) member_id
    where not exists (
      select 1 from public.workspace_members
      where workspace_id = selected_event.workspace_id and user_id = member_id
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

  delete from public.calendar_event_participants
   where event_id = selected_event.id
     and not (user_id = any(normalized_participants));

  foreach participant_id in array normalized_participants loop
    insert into public.calendar_event_participants(event_id, workspace_id, user_id)
    values (selected_event.id, selected_event.workspace_id, participant_id)
    on conflict (event_id, user_id) do nothing;
  end loop;

  update public.calendar_event_reminders
     set status = 'cancelled', last_error = null
   where event_id = selected_event.id
     and status <> 'sent'
     and (
       not (user_id = any(normalized_participants))
       or not (preset = any(normalized_presets))
     );

  foreach participant_id in array normalized_participants loop
    foreach selected_preset in array normalized_presets loop
      selected_offset := case selected_preset
        when 'one_hour_before' then -60
        when 'six_hours_before' then -360
        when 'one_day_before' then -1440
        when 'three_days_before' then -4320
        when 'five_days_before' then -7200
      end;

      insert into public.calendar_event_reminders(
        workspace_id, event_id, user_id, channel, preset, offset_minutes, remind_at
      ) values (
        selected_event.workspace_id, selected_event.id, participant_id, 'telegram',
        selected_preset, selected_offset, selected_event.starts_at + make_interval(mins => selected_offset)
      )
      on conflict (event_id, user_id, channel, offset_minutes) do update
        set preset = excluded.preset,
            remind_at = case when public.calendar_event_reminders.status = 'sent' then public.calendar_event_reminders.remind_at else excluded.remind_at end,
            status = case when public.calendar_event_reminders.status = 'sent' then 'sent'::public.reminder_status else 'pending'::public.reminder_status end,
            attempt_count = case when public.calendar_event_reminders.status = 'sent' then public.calendar_event_reminders.attempt_count else 0 end,
            last_attempt_at = case when public.calendar_event_reminders.status = 'sent' then public.calendar_event_reminders.last_attempt_at else null end,
            last_error = null;
    end loop;
  end loop;
end;
$$;

create function public.create_calendar_event(
  event_title text,
  event_description text,
  event_category public.calendar_event_category,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[]
)
returns public.calendar_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workspace_id uuid;
  created_event public.calendar_events%rowtype;
begin
  if length(btrim(coalesce(event_title, ''))) = 0 then
    raise exception 'Event title is required' using errcode = '23514';
  end if;
  if event_ends_at is not null and event_ends_at <= event_starts_at then
    raise exception 'Event end must follow start' using errcode = '23514';
  end if;

  select workspace_id into target_workspace_id
    from public.workspace_members
   where user_id = (select auth.uid())
   order by joined_at
   limit 1;
  if target_workspace_id is null or not private.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace not found' using errcode = 'P0002';
  end if;

  insert into public.calendar_events(workspace_id, title, description, category, starts_at, ends_at, created_by)
  values (target_workspace_id, btrim(event_title), nullif(btrim(coalesce(event_description, '')), ''), event_category, event_starts_at, event_ends_at, (select auth.uid()))
  returning * into created_event;

  perform private.sync_calendar_event_configuration(created_event, participant_ids, reminder_presets);
  return created_event;
end;
$$;

create function public.update_calendar_event(
  target_event_id uuid,
  event_title text,
  event_description text,
  event_category public.calendar_event_category,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  participant_ids uuid[],
  reminder_presets public.reminder_preset[]
)
returns public.calendar_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_event public.calendar_events%rowtype;
begin
  if length(btrim(coalesce(event_title, ''))) = 0 then
    raise exception 'Event title is required' using errcode = '23514';
  end if;
  if event_ends_at is not null and event_ends_at <= event_starts_at then
    raise exception 'Event end must follow start' using errcode = '23514';
  end if;

  update public.calendar_events
     set title = btrim(event_title),
         description = nullif(btrim(coalesce(event_description, '')), ''),
         category = event_category,
         starts_at = event_starts_at,
         ends_at = event_ends_at
   where id = target_event_id
     and deleted_at is null
     and private.is_workspace_member(workspace_id)
  returning * into updated_event;

  if updated_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  perform private.sync_calendar_event_configuration(updated_event, participant_ids, reminder_presets);
  return updated_event;
end;
$$;

create function public.delete_calendar_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.calendar_events%rowtype;
begin
  update public.calendar_events
     set deleted_at = now()
   where id = target_event_id
     and deleted_at is null
     and private.is_workspace_member(workspace_id)
  returning * into target_event;
  if target_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  delete from public.calendar_event_participants where event_id = target_event.id;
  update public.calendar_event_reminders
     set status = 'cancelled', last_error = null
   where event_id = target_event.id and status <> 'sent';
end;
$$;

create function public.claim_due_calendar_event_reminders(batch_size integer default 25)
returns table (
  reminder_id uuid,
  workspace_id uuid,
  event_id uuid,
  user_id uuid,
  channel public.reminder_channel,
  preset public.reminder_preset,
  attempt_number integer,
  event_title text,
  starts_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select reminder.id
      from public.calendar_event_reminders reminder
      join public.calendar_events event on event.id = reminder.event_id and event.workspace_id = reminder.workspace_id
     where reminder.remind_at <= now()
       and reminder.attempt_count < 3
       and event.deleted_at is null
       and (
         reminder.status = 'pending'
         or (reminder.status = 'failed' and reminder.last_attempt_at <= now() - interval '5 minutes')
       )
     order by reminder.remind_at, reminder.id
     for update of reminder skip locked
     limit greatest(1, least(coalesce(batch_size, 25), 100))
  ), claimed as (
    update public.calendar_event_reminders reminder
       set status = 'processing',
           attempt_count = reminder.attempt_count + 1,
           last_attempt_at = now(),
           last_error = null
      from due
     where reminder.id = due.id
     returning reminder.*
  )
  select claimed.id, claimed.workspace_id, claimed.event_id, claimed.user_id,
         claimed.channel, claimed.preset, claimed.attempt_count, event.title, event.starts_at
    from claimed
    join public.calendar_events event on event.id = claimed.event_id and event.workspace_id = claimed.workspace_id
   order by claimed.remind_at, claimed.id;
end;
$$;

create function public.finish_calendar_event_reminder_attempt(
  target_reminder_id uuid,
  target_attempt_number integer,
  delivery_succeeded boolean,
  delivery_error text default null,
  external_message_id text default null,
  delivery_metadata jsonb default '{}'::jsonb
)
returns public.reminder_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.calendar_event_reminders%rowtype;
  next_status public.reminder_status;
begin
  select * into claimed from public.calendar_event_reminders
   where id = target_reminder_id for update;
  if claimed.id is null or claimed.status <> 'processing' or claimed.attempt_count <> target_attempt_number then
    raise exception 'Reminder attempt is not current' using errcode = 'P0001';
  end if;
  next_status := case when delivery_succeeded then 'sent'::public.reminder_status else 'failed'::public.reminder_status end;

  insert into public.calendar_event_notification_deliveries(
    workspace_id, reminder_id, user_id, channel, status, attempt_number,
    provider_message_id, delivered_at, error_message, metadata
  ) values (
    claimed.workspace_id, claimed.id, claimed.user_id, claimed.channel,
    case when delivery_succeeded then 'sent'::public.notification_delivery_status else 'failed'::public.notification_delivery_status end,
    target_attempt_number, external_message_id,
    case when delivery_succeeded then now() else null end,
    case when delivery_succeeded then null else left(coalesce(delivery_error, 'unknown_error'), 2000) end,
    coalesce(delivery_metadata, '{}'::jsonb)
  ) on conflict (reminder_id, attempt_number) do nothing;

  update public.calendar_event_reminders
     set status = next_status,
         sent_at = case when delivery_succeeded then now() else null end,
         last_error = case when delivery_succeeded then null else left(coalesce(delivery_error, 'unknown_error'), 2000) end
   where id = claimed.id;
  return next_status;
end;
$$;

alter table public.calendar_events enable row level security;
alter table public.calendar_event_participants enable row level security;
alter table public.calendar_event_reminders enable row level security;
alter table public.calendar_event_notification_deliveries enable row level security;

create policy "members can view calendar events" on public.calendar_events
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can view calendar event participants" on public.calendar_event_participants
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can view calendar event reminders" on public.calendar_event_reminders
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy "members can view calendar event deliveries" on public.calendar_event_notification_deliveries
for select to authenticated using (private.is_workspace_member(workspace_id));

revoke all on public.calendar_events, public.calendar_event_participants, public.calendar_event_reminders, public.calendar_event_notification_deliveries from anon;
revoke all on public.calendar_events, public.calendar_event_participants, public.calendar_event_reminders, public.calendar_event_notification_deliveries from authenticated;
grant select on public.calendar_events, public.calendar_event_participants, public.calendar_event_reminders, public.calendar_event_notification_deliveries to authenticated;

revoke all on function private.sync_calendar_event_configuration(public.calendar_events, uuid[], public.reminder_preset[]) from public, anon, authenticated;

revoke all on function public.create_calendar_event(text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) from public;
grant execute on function public.create_calendar_event(text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) to authenticated;
revoke all on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) from public;
grant execute on function public.update_calendar_event(uuid, text, text, public.calendar_event_category, timestamptz, timestamptz, uuid[], public.reminder_preset[]) to authenticated;
revoke all on function public.delete_calendar_event(uuid) from public;
grant execute on function public.delete_calendar_event(uuid) to authenticated;
revoke all on function public.claim_due_calendar_event_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_calendar_event_reminders(integer) to service_role;
revoke all on function public.finish_calendar_event_reminder_attempt(uuid, integer, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finish_calendar_event_reminder_attempt(uuid, integer, boolean, text, text, jsonb) to service_role;

commit;
