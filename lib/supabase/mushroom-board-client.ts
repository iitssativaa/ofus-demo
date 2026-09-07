"use client";

import type { MushroomBoardNoteInput } from "@/lib/types";
import type { Database } from "./database.types";
import { createClient } from "./client";
import { mushroomBoardNoteFromRow } from "./mushroom-board-models";

type MushroomBoardUpdate = Database["public"]["Tables"]["mushroom_board_notes"]["Update"];

async function context() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");
  const { data: membership, error: membershipError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).order("joined_at").limit(1).single();
  if (membershipError || !membership) throw new Error("Çalışma alanı üyeliği bulunamadı.");
  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

export async function createMushroomBoardNote(input: MushroomBoardNoteInput, requestId: string) {
  const { supabase, workspaceId } = await context();
  const { data, error } = await supabase.rpc("create_mushroom_board_note", {
    target_workspace_id: workspaceId,
    note_content: input.content.trim(),
    target_note_date: input.noteDate,
    note_priority: input.priority,
    note_request_id: requestId,
  });
  if (error) throw error;
  return mushroomBoardNoteFromRow(data);
}

export async function updateMushroomBoardNote(id: string, input: MushroomBoardNoteInput) {
  const { supabase, userId, workspaceId } = await context();
  const update: MushroomBoardUpdate = {
    content: input.content.trim(),
    note_date: input.noteDate,
    priority: input.priority,
  };
  const { data, error } = await supabase
    .from("mushroom_board_notes")
    .update(update)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .eq("created_by", userId)
    .select()
    .single();
  if (error) throw error;
  return mushroomBoardNoteFromRow(data);
}

export async function deleteMushroomBoardNote(id: string) {
  const { supabase, userId, workspaceId } = await context();
  const { error } = await supabase
    .from("mushroom_board_notes")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}
