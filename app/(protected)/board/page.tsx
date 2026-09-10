import { MushroomBoard } from "@/components/mushroom-board";
import { listMushroomBoardNotes } from "@/lib/supabase/mushroom-board";

export default async function BoardPage() {
  const data = await listMushroomBoardNotes();
  return <><h1 className="sr-only">Mantar Pano</h1><MushroomBoard initialNotes={data.notes} currentUserId={data.currentUserId} /></>;
}
