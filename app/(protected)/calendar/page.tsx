import { TaskWorkspace } from "@/components/task-workspace";
import type { CalendarEvent, CalendarRoutine } from "@/lib/calendar-event-types";
import { listCalendarEvents } from "@/lib/supabase/calendar-events";
import { listCalendarRoutines } from "@/lib/supabase/calendar-routines";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function CalendarPage() {
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  let calendarEvents: CalendarEvent[] = [];
  let calendarRoutines: CalendarRoutine[] = [];
  let loadError = "";
  try {
    [data, calendarEvents, calendarRoutines] = await Promise.all([
      listTaskWorkspaceData({ activityLimit: 100 }),
      listCalendarEvents(),
      listCalendarRoutines(),
    ]);
  } catch {
    loadError = "Takvim yüklenemedi.";
  }
  return <TaskWorkspace data={data} calendarEvents={calendarEvents} calendarRoutines={calendarRoutines} view="calendar" loadError={loadError} />;
}
