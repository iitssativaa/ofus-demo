import type { MushroomBoardNote, MushroomNotePriority } from "@/lib/types";
import type { Database } from "./database.types";

type MushroomBoardRow = Database["public"]["Tables"]["mushroom_board_notes"]["Row"];

export function mushroomBoardNoteFromRow(row: MushroomBoardRow): MushroomBoardNote {
  return {
    id: row.id,
    content: row.content,
    noteDate: row.note_date,
    priority: row.priority as MushroomNotePriority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
