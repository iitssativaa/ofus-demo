begin;

alter table public.task_reminders
  drop constraint task_reminders_offset_minutes_check,
  add constraint task_reminders_offset_minutes_check check (
    offset_minutes in (-7200, -4320, -1440, -360, -180, -60, 0)
  );

commit;
