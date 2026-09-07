begin;

alter table public.profiles
  add column theme_preference text not null default 'system'
  constraint profiles_theme_preference_check
  check (theme_preference in ('light', 'dark', 'system'));

commit;
