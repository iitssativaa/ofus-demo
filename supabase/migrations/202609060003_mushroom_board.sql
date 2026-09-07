create table public.mushroom_board_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  note_date date not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mushroom_board_notes_creator_membership_fk
    foreign key (workspace_id, created_by)
    references public.workspace_members(workspace_id, user_id)
    on delete cascade
);

create index mushroom_board_notes_workspace_sort_idx
on public.mushroom_board_notes(workspace_id, note_date, priority, created_at desc, id desc);

create trigger mushroom_board_notes_set_updated_at
before update on public.mushroom_board_notes
for each row execute function private.set_updated_at();

alter table public.mushroom_board_notes enable row level security;

create policy "workspace members can read mushroom board notes"
on public.mushroom_board_notes
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "workspace members can create mushroom board notes"
on public.mushroom_board_notes
for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy "creators can update mushroom board notes"
on public.mushroom_board_notes
for update to authenticated
using (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
)
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy "creators can delete mushroom board notes"
on public.mushroom_board_notes
for delete to authenticated
using (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

revoke all on public.mushroom_board_notes from anon;
grant select, insert, update, delete on public.mushroom_board_notes to authenticated;

alter table public.task_activities alter column task_id drop not null;
alter table public.task_activities add column entity_type text not null default 'task';
alter table public.task_activities add column entity_id uuid;

update public.task_activities
set entity_id = task_id
where entity_id is null;

create function private.normalize_task_activity_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.entity_type = 'task' and new.entity_id is null then
    new.entity_id := new.task_id;
  end if;
  return new;
end;
$$;

create trigger task_activities_normalize_entity
before insert or update on public.task_activities
for each row execute function private.normalize_task_activity_entity();

alter table public.task_activities alter column entity_id set not null;
alter table public.task_activities add constraint task_activities_entity_shape_check check (
  (entity_type = 'task' and task_id is not null and entity_id = task_id)
  or (entity_type = 'mushroom_note' and task_id is null)
);

create index task_activities_workspace_feed_idx
on public.task_activities(workspace_id, created_at desc, id desc);

create function public.create_mushroom_board_note(
  target_workspace_id uuid,
  note_content text,
  target_note_date date,
  note_priority smallint default 2
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
    created_by
  ) values (
    target_workspace_id,
    btrim(note_content),
    target_note_date,
    note_priority,
    (select auth.uid())
  )
  returning * into created_note;

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

revoke all on function public.create_mushroom_board_note(uuid, text, date, smallint) from public;
grant execute on function public.create_mushroom_board_note(uuid, text, date, smallint) to authenticated;
