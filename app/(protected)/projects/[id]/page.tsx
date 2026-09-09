import { ProjectDetailView } from "@/components/project-detail-view";
import { TaskCompletionDialog } from "@/components/task-completion-dialog";
import { TaskDeletionDialog } from "@/components/task-deletion-dialog";
import { TaskDetail } from "@/components/task-detail";
import { notFound } from "next/navigation";
import { TaskDataProvider } from "@/components/task-data-provider";
import { getProjectData } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detailData: Awaited<ReturnType<typeof getProjectData>> & { loadError?: string };
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try {
    [detailData, taskData] = await Promise.all([
      getProjectData(id),
      listTaskWorkspaceData(),
    ]);
  } catch (error) {
    console.error("Project could not be loaded", error);
    detailData = { project: null, company: null, companies: [], linkedTaskCount: 0, loadError: "Proje yüklenemedi." };
  }
  if (!detailData.loadError && !detailData.project) notFound();
  return <TaskDataProvider data={taskData}><ProjectDetailView {...detailData} /><TaskDetail /><TaskCompletionDialog /><TaskDeletionDialog /></TaskDataProvider>;
}
