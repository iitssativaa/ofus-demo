begin;

do $$
declare
  canonical_job_name constant text := 'process-task-reminders-every-minute';
  project_url_secret text;
  cron_secret text;
  matching_job record;
  matching_job_count integer;
  canonical_job_is_healthy boolean;
begin
  select decrypted_secret
    into project_url_secret
    from vault.decrypted_secrets
   where name = 'project_url';

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'reminder_cron_secret';

  if project_url_secret is null or project_url_secret !~ '^https://[^/]+[.]supabase[.]co/?$' then
    raise exception 'Valid project_url Vault secret is required before scheduling reminders';
  end if;
  if cron_secret is null or char_length(cron_secret) < 32 then
    raise exception 'A strong reminder_cron_secret Vault secret is required before scheduling reminders';
  end if;

  select count(*)::integer
    into matching_job_count
    from cron.job
   where jobname = canonical_job_name
      or command ilike '%/functions/v1/process-task-reminders%';

  select exists (
    select 1
      from cron.job
     where jobname = canonical_job_name
       and schedule = '* * * * *'
       and active
       and command ilike '%/functions/v1/process-task-reminders%'
       and command ilike '%x-reminder-cron-secret%'
  ) into canonical_job_is_healthy;

  if matching_job_count <> 1 or not canonical_job_is_healthy then
    for matching_job in
      select jobid
        from cron.job
       where jobname = canonical_job_name
          or command ilike '%/functions/v1/process-task-reminders%'
    loop
      perform cron.unschedule(matching_job.jobid);
    end loop;

    perform cron.schedule(
      canonical_job_name,
      '* * * * *',
      $job$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'project_url'), '/')
            || '/functions/v1/process-task-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-reminder-cron-secret',
            (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end;
$$;

comment on extension pg_cron is
  'Runs the canonical OfUs reminder processor every minute; job configuration is managed by migrations.';

commit;
