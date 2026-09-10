import { TaskWorkspace } from "@/components/task-workspace";
import type { CalendarEvent } from "@/lib/calendar-event-types";
import { listCalendarEvents } from "@/lib/supabase/calendar-events";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function DashboardPage() {
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  let calendarEvents: CalendarEvent[] = [];
  let loadError = "";
  try {
    [data, calendarEvents] = await Promise.all([
      listTaskWorkspaceData({ activityLimit: 100 }),
      listCalendarEvents(),
    ]);
  } catch {
    loadError = "Dashboard verileri yüklenemedi.";
  }
  return <TaskWorkspace data={data} calendarEvents={calendarEvents} view="dashboard" loadError={loadError} />;
}
