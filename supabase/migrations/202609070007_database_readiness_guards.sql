begin;

do $$
declare
  table_name text;
  rls_enabled boolean;
begin
  foreach table_name in array array[
    'profiles', 'workspaces', 'workspace_members', 'companies', 'projects', 'tasks',
    'task_activities', 'task_reminders', 'notification_deliveries', 'telegram_link_tokens',
    'calendar_events', 'calendar_event_participants', 'calendar_event_reminders',
    'calendar_event_notification_deliveries', 'calendar_routines',
    'calendar_routine_participants', 'calendar_routine_reminder_presets',
    'resource_links', 'mushroom_board_notes'
  ]
  loop
    select relation.relrowsecurity
      into rls_enabled
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = table_name
       and relation.relkind = 'r';

    if rls_enabled is distinct from true then
      raise exception 'RLS readiness check failed for public.%', table_name;
    end if;
  end loop;

  if (select count(*) from cron.job
       where jobname = 'process-task-reminders-every-minute'
          or command ilike '%/functions/v1/process-task-reminders%') <> 1 then
    raise exception 'Reminder scheduler must have exactly one canonical job';
  end if;

  if not exists (
    select 1 from cron.job
     where jobname = 'process-task-reminders-every-minute'
       and schedule = '* * * * *'
       and active
       and command ilike '%/functions/v1/process-task-reminders%'
       and command ilike '%x-reminder-cron-secret%'
  ) then
    raise exception 'Canonical reminder scheduler is missing or inactive';
  end if;

  if to_regprocedure('public.claim_due_reminders(integer)') is null
     or to_regprocedure('public.finish_reminder_attempt(uuid,integer,boolean,text,text,jsonb)') is null
     or to_regprocedure('public.claim_due_calendar_event_reminders(integer)') is null
     or to_regprocedure('public.finish_calendar_event_reminder_attempt(uuid,integer,boolean,text,text,jsonb)') is null
     or to_regprocedure('public.materialize_calendar_routine_occurrences(integer)') is null then
    raise exception 'Reminder processing function readiness check failed';
  end if;
end;
$$;

commit;
