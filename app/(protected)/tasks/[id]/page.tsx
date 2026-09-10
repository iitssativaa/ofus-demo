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
  const from = query.from === "inbox" ? "/inbox" : query.from;
  const baseFrom = from?.split("?")[0] ?? "";
  const projectContext = baseFrom.match(/^\/projects\/([^/]+)$/)?.[1];
  const companyContext = baseFrom.match(/^\/companies\/([^/]+)$/)?.[1];
  const selected = data.tasks.find((task) => task.id === id);
  const validContext = ["/tasks", "/dashboard", "/inbox", "/calendar"].includes(baseFrom)
    || Boolean(projectContext && selected?.projectId === projectContext)
    || Boolean(companyContext && selected?.companyId === companyContext);
  const taskReturnHref = validContext ? from : "/tasks";
  return <TaskWorkspace data={data} loadError={loadError} initialSelectedTaskId={id} taskReturnHref={taskReturnHref} />;
}
