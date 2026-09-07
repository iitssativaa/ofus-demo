import type { MushroomBoardNote } from "@/lib/types";
import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { createClient } from "./server";
import { mushroomBoardNoteFromRow } from "./mushroom-board-models";

export type MushroomBoardData = {
  notes: MushroomBoardNote[];
  currentUserId: string;
};

export async function listMushroomBoardNotes(): Promise<MushroomBoardData> {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mushroom_board_notes")
    .select("*")
    .eq("workspace_id", identity.workspaceId)
    .order("note_date", { ascending: true })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return { notes: data.map(mushroomBoardNoteFromRow), currentUserId: identity.userId };
}
