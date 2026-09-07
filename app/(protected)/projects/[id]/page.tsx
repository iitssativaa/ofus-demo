import { ProjectDetailView } from "@/components/project-detail-view";
import { TaskDataProvider } from "@/components/task-data-provider";
import { getProjectData } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let props: Awaited<ReturnType<typeof getProjectData>> & { loadError?: string };
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try {
    [props, taskData] = await Promise.all([
      getProjectData(id),
      listTaskWorkspaceData(),
    ]);
  } catch (error) {
    console.error("Project could not be loaded", error);
    props = { project: null, company: null, companies: [], linkedTaskCount: 0, loadError: "Proje yüklenemedi." };
  }
  return <TaskDataProvider data={taskData}><ProjectDetailView {...props} /></TaskDataProvider>;
}
