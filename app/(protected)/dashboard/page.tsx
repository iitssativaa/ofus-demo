import { TaskWorkspace } from "@/components/task-workspace";
import type { CalendarEvent } from "@/lib/calendar-event-types";
import { listCalendarEvents } from "@/lib/supabase/calendar-events";
import { listMushroomBoardNotes, type MushroomBoardData } from "@/lib/supabase/mushroom-board";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function DashboardPage() {
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  let calendarEvents: CalendarEvent[] = [];
  let mushroomBoard: MushroomBoardData = { notes: [], currentUserId: "" };
  let loadError = "";
  try {
    [data, calendarEvents, mushroomBoard] = await Promise.all([
      listTaskWorkspaceData({ activityLimit: 100 }),
      listCalendarEvents(),
      listMushroomBoardNotes(),
    ]);
  } catch {
    loadError = "Dashboard verileri yüklenemedi.";
  }
  return <TaskWorkspace data={data} calendarEvents={calendarEvents} mushroomBoard={mushroomBoard} view="dashboard" loadError={loadError} />;
}
