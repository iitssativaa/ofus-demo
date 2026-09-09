import { ProjectsView } from "@/components/projects-view";
import { TaskDataProvider } from "@/components/task-data-provider";
import { listCompaniesAndProjects } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function ProjectsPage() {
  let props;
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  let taskDataAvailable = false;
  const [businessResult, taskResult] = await Promise.allSettled([listCompaniesAndProjects(), listTaskWorkspaceData()]);
  try {
    if (businessResult.status === "rejected") throw businessResult.reason;
    props = businessResult.value;
  } catch (error) {
    console.error("Projects could not be loaded", error);
    props = { companies: [], projects: [], loadError: "Projeler yüklenemedi." };
  }
  if (taskResult.status === "fulfilled") { taskData = taskResult.value; taskDataAvailable = true; }
  return <TaskDataProvider data={taskData}><ProjectsView {...props} taskDataAvailable={taskDataAvailable} /></TaskDataProvider>;
}
