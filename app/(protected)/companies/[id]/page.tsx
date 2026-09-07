import { CompanyDetailView } from "@/components/company-detail-view";
import { TaskDataProvider } from "@/components/task-data-provider";
import { getCompanyData } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let props: Awaited<ReturnType<typeof getCompanyData>> & { loadError?: string };
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try {
    [props, taskData] = await Promise.all([
      getCompanyData(id),
      listTaskWorkspaceData(),
    ]);
  } catch (error) {
    console.error("Company could not be loaded", error);
    props = { company: null, projects: [], linkedTaskCount: 0, loadError: "Firma yüklenemedi." };
  }
  return <TaskDataProvider data={taskData}><CompanyDetailView {...props} /></TaskDataProvider>;
}
