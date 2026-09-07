import { TaskWorkspace } from "@/components/task-workspace";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function TasksPage() {
  let loadError = "";
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };

  try {
    data = await listTaskWorkspaceData();
  } catch (error) {
    console.error("Görev çalışma alanı yüklenemedi", error);
    loadError = "Görevler yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.";
  }

  return <TaskWorkspace data={data} loadError={loadError} />;
}
