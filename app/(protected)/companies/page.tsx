import { CompaniesView } from "@/components/companies-view";
import { TaskDataProvider } from "@/components/task-data-provider";
import { listCompaniesAndProjects } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function CompaniesPage() {
  let props: Awaited<ReturnType<typeof listCompaniesAndProjects>> & { loadError?: string };
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try {
    [props, taskData] = await Promise.all([
      listCompaniesAndProjects(),
      listTaskWorkspaceData(),
    ]);
  } catch (error) {
    console.error("Companies could not be loaded", error);
    props = { companies: [], projects: [], loadError: "Firmalar yüklenemedi." };
  }
  return <TaskDataProvider data={taskData}><CompaniesView {...props} /></TaskDataProvider>;
}
