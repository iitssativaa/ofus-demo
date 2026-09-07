begin;

alter table public.profiles
  add column telegram_chat_id text,
  add column telegram_username text,
  add column telegram_connected_at timestamptz,
  add constraint profiles_telegram_chat_id_format check (
    telegram_chat_id is null or telegram_chat_id ~ '^[0-9]+$'
  ),
  add constraint profiles_telegram_username_length check (
    telegram_username is null or length(telegram_username) between 1 and 64
  ),
  add constraint profiles_telegram_connection_consistency check (
    (telegram_chat_id is null and telegram_connected_at is null)
    or (telegram_chat_id is not null and telegram_connected_at is not null)
  );

create unique index profiles_telegram_chat_id_unique
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null;

create table public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index telegram_link_tokens_active_idx
  on public.telegram_link_tokens (token_hash, expires_at)
  where used_at is null;

alter table public.telegram_link_tokens enable row level security;
revoke all on public.telegram_link_tokens from public, anon, authenticated;

create function public.get_own_telegram_connection()
returns table (
  connected boolean,
  username text,
  connected_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.telegram_chat_id is not null,
         profile.telegram_username,
         profile.telegram_connected_at
    from public.profiles profile
   where profile.id = (select auth.uid());
$$;

create function public.consume_telegram_link_token(
  target_token_hash text,
  target_chat_id text,
  target_username text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_token public.telegram_link_tokens%rowtype;
begin
  if target_token_hash !~ '^[0-9a-f]{64}$' or target_chat_id !~ '^[0-9]+$' then
    return 'invalid';
  end if;

  select * into selected_token
    from public.telegram_link_tokens
   where token_hash = target_token_hash
   for update;

  if selected_token.id is null then
    return 'invalid';
  end if;
  if selected_token.used_at is not null then
    return 'used';
  end if;
  if selected_token.expires_at <= now() then
    return 'expired';
  end if;
  if exists (
    select 1 from public.profiles
     where telegram_chat_id = target_chat_id
       and id <> selected_token.user_id
  ) then
    return 'chat_already_linked';
  end if;

  update public.profiles
     set telegram_chat_id = target_chat_id,
         telegram_username = nullif(left(btrim(target_username), 64), ''),
         telegram_connected_at = now()
   where id = selected_token.user_id;

  update public.telegram_link_tokens
     set used_at = now()
   where id = selected_token.id;

  return 'connected';
exception
  when unique_violation then
    return 'chat_already_linked';
end;
$$;

revoke all on function public.get_own_telegram_connection() from public;
grant execute on function public.get_own_telegram_connection() to authenticated;
revoke all on function public.consume_telegram_link_token(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_telegram_link_token(text, text, text) to service_role;

-- Telegram kimliği yalnızca sunucu tarafındaki bağlantı akışıyla değiştirilebilir.
revoke select, update on public.profiles from authenticated;
grant select (id, display_name, avatar_url, created_at, updated_at, theme_preference)
  on public.profiles to authenticated;
grant update (display_name, avatar_url, theme_preference)
  on public.profiles to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

commit;
