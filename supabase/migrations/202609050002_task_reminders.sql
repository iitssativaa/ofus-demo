begin;

create type public.reminder_channel as enum ('telegram', 'push', 'email');
create type public.reminder_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');
create type public.notification_delivery_status as enum ('sent', 'failed');

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  task_id uuid not null,
  user_id uuid not null,
  channel public.reminder_channel not null default 'telegram',
  offset_minutes integer not null check (offset_minutes in (-1440, -180, 0)),
  remind_at timestamptz not null,
  status public.reminder_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  last_attempt_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_reminders_task_workspace_fk foreign key (task_id, workspace_id)
    references public.tasks(id, workspace_id) on delete cascade,
  constraint task_reminders_user_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade,
  unique (task_id, user_id, channel, offset_minutes)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  reminder_id uuid not null references public.task_reminders(id) on delete cascade,
  user_id uuid not null,
  channel public.reminder_channel not null,
  status public.notification_delivery_status not null,
  attempt_number integer not null check (attempt_number between 1 and 3),
  provider_message_id text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  constraint notification_deliveries_user_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id) on delete cascade,
  unique (reminder_id, attempt_number)
);

create index task_reminders_due_claim_idx
  on public.task_reminders (remind_at, last_attempt_at)
  where status in ('pending', 'failed');
create index task_reminders_workspace_task_idx on public.task_reminders(workspace_id, task_id);
create index notification_deliveries_workspace_attempted_idx on public.notification_deliveries(workspace_id, attempted_at desc);

create trigger task_reminders_set_updated_at before update on public.task_reminders
for each row execute function private.set_updated_at();

create function private.sync_task_reminders_after_task_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('completed', 'cancelled') then
    update public.task_reminders
       set status = 'cancelled', last_error = null
     where task_id = new.id
       and status in ('pending', 'processing', 'failed');
    return new;
  end if;

  if new.due_at is distinct from old.due_at or new.assignee_id is distinct from old.assignee_id then
    if new.due_at is null or new.assignee_id is null then
      update public.task_reminders
         set status = 'cancelled', last_error = null
       where task_id = new.id
         and status in ('pending', 'processing', 'failed');
    else
      update public.task_reminders
         set user_id = new.assignee_id,
             remind_at = new.due_at + make_interval(mins => offset_minutes),
             status = 'pending',
             attempt_count = 0,
             last_attempt_at = null,
             last_error = null
       where task_id = new.id
         and status in ('pending', 'failed', 'cancelled');
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_sync_reminders_after_change
after update of due_at, assignee_id, status on public.tasks
for each row execute function private.sync_task_reminders_after_task_change();

create function public.set_task_reminders(target_task_id uuid, reminder_offsets integer[])
returns setof public.task_reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_task public.tasks%rowtype;
  selected_offset integer;
  normalized_offsets integer[];
begin
  select * into selected_task
    from public.tasks
   where id = target_task_id
   for update;

  if selected_task.id is null or not private.is_workspace_member(selected_task.workspace_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct value order by value), '{}'::integer[])
    into normalized_offsets
    from unnest(coalesce(reminder_offsets, '{}'::integer[])) as value;

  if exists (select 1 from unnest(normalized_offsets) value where value not in (-1440, -180, 0)) then
    raise exception 'Unsupported reminder offset' using errcode = '22023';
  end if;

  if cardinality(normalized_offsets) > 0 and (selected_task.due_at is null or selected_task.assignee_id is null) then
    raise exception 'Task due date and assignee are required for reminders' using errcode = '23514';
  end if;

  if selected_task.status in ('completed', 'cancelled') and cardinality(normalized_offsets) > 0 then
    raise exception 'Closed tasks cannot have pending reminders' using errcode = '23514';
  end if;

  update public.task_reminders
     set status = 'cancelled', last_error = null
   where task_id = selected_task.id
     and status <> 'sent'
     and not (offset_minutes = any(normalized_offsets));

  foreach selected_offset in array normalized_offsets loop
    insert into public.task_reminders (
      workspace_id, task_id, user_id, channel, offset_minutes, remind_at
    ) values (
      selected_task.workspace_id,
      selected_task.id,
      selected_task.assignee_id,
      'telegram',
      selected_offset,
      selected_task.due_at + make_interval(mins => selected_offset)
    )
    on conflict (task_id, user_id, channel, offset_minutes) do update
      set remind_at = excluded.remind_at,
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

create function public.claim_due_reminders(batch_size integer default 25)
returns table (
  reminder_id uuid,
  workspace_id uuid,
  task_id uuid,
  user_id uuid,
  channel public.reminder_channel,
  attempt_number integer,
  task_title text,
  due_at timestamptz,
  company_name text,
  project_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select reminder.id
      from public.task_reminders reminder
      join public.tasks task on task.id = reminder.task_id and task.workspace_id = reminder.workspace_id
     where reminder.remind_at <= now()
       and reminder.attempt_count < 3
       and (
         reminder.status = 'pending'
         or (reminder.status = 'failed' and reminder.last_attempt_at <= now() - interval '5 minutes')
       )
       and task.status not in ('completed', 'cancelled')
     order by reminder.remind_at, reminder.id
     for update of reminder skip locked
     limit greatest(1, least(coalesce(batch_size, 25), 100))
  ), claimed as (
    update public.task_reminders reminder
       set status = 'processing',
           attempt_count = reminder.attempt_count + 1,
           last_attempt_at = now(),
           last_error = null
      from due
     where reminder.id = due.id
     returning reminder.*
  )
  select claimed.id,
         claimed.workspace_id,
         claimed.task_id,
         claimed.user_id,
         claimed.channel,
         claimed.attempt_count,
         task.title,
         task.due_at,
         company.name,
         project.name
    from claimed
    join public.tasks task on task.id = claimed.task_id and task.workspace_id = claimed.workspace_id
    join public.companies company on company.id = task.company_id and company.workspace_id = task.workspace_id
    join public.projects project on project.id = task.project_id and project.workspace_id = task.workspace_id
   order by claimed.remind_at, claimed.id;
end;
$$;

create function public.finish_reminder_attempt(
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
  claimed public.task_reminders%rowtype;
  next_status public.reminder_status;
begin
  select * into claimed
    from public.task_reminders
   where id = target_reminder_id
   for update;

  if claimed.id is null
     or claimed.status <> 'processing'
     or claimed.attempt_count <> target_attempt_number then
    raise exception 'Reminder attempt is not current' using errcode = 'P0001';
  end if;

  next_status := case when delivery_succeeded then 'sent'::public.reminder_status else 'failed'::public.reminder_status end;

  insert into public.notification_deliveries (
    workspace_id, reminder_id, user_id, channel, status, attempt_number,
    provider_message_id, delivered_at, error_message, metadata
  ) values (
    claimed.workspace_id,
    claimed.id,
    claimed.user_id,
    claimed.channel,
    case when delivery_succeeded then 'sent'::public.notification_delivery_status else 'failed'::public.notification_delivery_status end,
    target_attempt_number,
    external_message_id,
    case when delivery_succeeded then now() else null end,
    case when delivery_succeeded then null else left(coalesce(delivery_error, 'unknown_error'), 2000) end,
    coalesce(delivery_metadata, '{}'::jsonb)
  )
  on conflict (reminder_id, attempt_number) do nothing;

  update public.task_reminders
     set status = next_status,
         sent_at = case when delivery_succeeded then now() else null end,
         last_error = case when delivery_succeeded then null else left(coalesce(delivery_error, 'unknown_error'), 2000) end
   where id = claimed.id;

  return next_status;
end;
$$;

revoke all on function public.set_task_reminders(uuid, integer[]) from public;
grant execute on function public.set_task_reminders(uuid, integer[]) to authenticated;
revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
revoke all on function public.finish_reminder_attempt(uuid, integer, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finish_reminder_attempt(uuid, integer, boolean, text, text, jsonb) to service_role;

alter table public.task_reminders enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "members can view workspace reminders" on public.task_reminders
for select to authenticated using (private.is_workspace_member(workspace_id));

create policy "members can view workspace deliveries" on public.notification_deliveries
for select to authenticated using (private.is_workspace_member(workspace_id));

revoke all on public.task_reminders, public.notification_deliveries from anon;
grant select on public.task_reminders to authenticated;
grant select on public.notification_deliveries to authenticated;

commit;
