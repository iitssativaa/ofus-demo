import { notFound } from "next/navigation";
import { TaskWorkspace } from "@/components/task-workspace";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let loadError = "";
  let data: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try { data = await listTaskWorkspaceData(); }
  catch (error) { console.error("Görev çalışma alanı yüklenemedi", error); loadError = "Görev yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin."; }
  if (!loadError && !data.tasks.some((task) => task.id === id)) notFound();
  return <TaskWorkspace data={data} loadError={loadError} initialSelectedTaskId={id} taskReturnHref={query.from === "inbox" ? "/inbox" : "/tasks"} />;
}
