begin;

revoke insert on public.profiles from authenticated;
grant insert (id, display_name, avatar_url, theme_preference)
  on public.profiles to authenticated;

commit;
