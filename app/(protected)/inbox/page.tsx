import { TaskWorkspace } from "@/components/task-workspace";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function InboxPage() {
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  let loadError = "";
  try {
    data = await listTaskWorkspaceData({ activityLimit: 100 });
  } catch {
    loadError = "İş hareketleri yüklenemedi.";
  }
  return <TaskWorkspace data={data} view="inbox" loadError={loadError} />;
}
