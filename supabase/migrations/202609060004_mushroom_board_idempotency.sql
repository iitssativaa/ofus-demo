alter table public.mushroom_board_notes
add column request_id uuid not null default gen_random_uuid();

alter table public.mushroom_board_notes
add constraint mushroom_board_notes_workspace_request_unique unique (workspace_id, request_id);

drop function public.create_mushroom_board_note(uuid, text, date, smallint);

create function public.create_mushroom_board_note(
  target_workspace_id uuid,
  note_content text,
  target_note_date date,
  note_priority smallint,
  note_request_id uuid
)
returns public.mushroom_board_notes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_note public.mushroom_board_notes;
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'Çalışma alanı üyeliği bulunamadı.';
  end if;

  if char_length(btrim(note_content)) < 1 or char_length(btrim(note_content)) > 1000 then
    raise exception 'Not 1 ile 1000 karakter arasında olmalıdır.';
  end if;

  if target_note_date is null then
    raise exception 'Tarih zorunludur.';
  end if;

  if note_priority not between 1 and 3 then
    raise exception 'Geçerli bir öncelik seçin.';
  end if;

  insert into public.mushroom_board_notes (
    workspace_id,
    content,
    note_date,
    priority,
    created_by,
    request_id
  ) values (
    target_workspace_id,
    btrim(note_content),
    target_note_date,
    note_priority,
    (select auth.uid()),
    note_request_id
  )
  on conflict (workspace_id, request_id) do nothing
  returning * into created_note;

  if created_note.id is null then
    select * into created_note
    from public.mushroom_board_notes
    where workspace_id = target_workspace_id
      and request_id = note_request_id
      and created_by = (select auth.uid());
    return created_note;
  end if;

  insert into public.task_activities (
    workspace_id,
    task_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) values (
    target_workspace_id,
    null,
    (select auth.uid()),
    'mushroom_note_created',
    'mushroom_note',
    created_note.id,
    'Mantar Pano''ya not ekledi',
    jsonb_build_object(
      'note_date', created_note.note_date,
      'priority', created_note.priority
    )
  );

  return created_note;
end;
$$;

revoke all on function public.create_mushroom_board_note(uuid, text, date, smallint, uuid) from public;
grant execute on function public.create_mushroom_board_note(uuid, text, date, smallint, uuid) to authenticated;
