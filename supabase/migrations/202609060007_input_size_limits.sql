begin;

-- PostgreSQL text/jsonb values are otherwise effectively unbounded. These limits
-- protect shared queries and activity feeds from oversized direct API payloads.
alter table public.profiles
  add constraint profiles_display_name_size_check check (char_length(display_name) <= 120) not valid,
  add constraint profiles_avatar_url_size_check check (avatar_url is null or char_length(avatar_url) <= 2048) not valid;

alter table public.workspaces
  add constraint workspaces_name_size_check check (char_length(name) <= 160) not valid;

alter table public.companies
  add constraint companies_text_size_check check (
    char_length(name) <= 240
    and char_length(coalesce(contact_name, '')) <= 200
    and char_length(coalesce(phone, '')) <= 64
    and char_length(coalesce(email, '')) <= 320
    and char_length(coalesce(website, '')) <= 2048
    and char_length(coalesce(notes, '')) <= 20000
  ) not valid;

alter table public.projects
  add constraint projects_text_size_check check (
    char_length(name) <= 240
    and char_length(description) <= 20000
    and char_length(coalesce(notes, '')) <= 20000
  ) not valid;

alter table public.tasks
  add constraint tasks_payload_size_check check (
    char_length(title) <= 500
    and char_length(description) <= 50000
    and char_length(coalesce(notes, '')) <= 20000
    and char_length(coalesce(result_note, '')) <= 20000
    and char_length(coalesce(completion_note, '')) <= 20000
    and char_length(coalesce(cancellation_note, '')) <= 20000
    and cardinality(tags) <= 50
    and octet_length(array_to_string(tags, '')) <= 5000
    and octet_length(checklist::text) <= 100000
  ) not valid;

alter table public.calendar_events
  add constraint calendar_events_text_size_check check (
    char_length(title) <= 500
    and char_length(coalesce(description, '')) <= 20000
  ) not valid;

alter table public.resource_links
  add constraint resource_links_text_size_check check (
    char_length(title) <= 240
    and char_length(coalesce(note, '')) <= 10000
  ) not valid;

commit;
