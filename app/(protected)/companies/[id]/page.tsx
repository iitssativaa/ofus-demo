import { DetailRouteFrame } from "@/components/detail-route-frame";
import { CompaniesView } from "@/components/companies-view";
import { CompanyDetailView } from "@/components/company-detail-view";
import { TaskCompletionDialog } from "@/components/task-completion-dialog";
import { TaskDeletionDialog } from "@/components/task-deletion-dialog";
import { TaskDetail } from "@/components/task-detail";
import { notFound } from "next/navigation";
import { TaskDataProvider } from "@/components/task-data-provider";
import { getCompanyData } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detailData: Awaited<ReturnType<typeof getCompanyData>> & { loadError?: string };
  let taskData: TaskWorkspaceData = { tasks: [], companies: [], projects: [], users: [], workspaceActivities: [] };
  try {
    [detailData, taskData] = await Promise.all([
      getCompanyData(id),
      listTaskWorkspaceData(),
    ]);
  } catch (error) {
    console.error("Company could not be loaded", error);
    detailData = { company: null, projects: [], linkedTaskCount: 0, loadError: "Firma yüklenemedi." };
  }
  if (!detailData.loadError && !detailData.company) notFound();
  return <TaskDataProvider data={taskData}><DetailRouteFrame label="Firma detayı" returnHref="/companies" width="company" background={<CompaniesView companies={taskData.companies} projects={taskData.projects} />}><CompanyDetailView key={id} {...detailData} /><TaskDetail /><TaskCompletionDialog /><TaskDeletionDialog /></DetailRouteFrame></TaskDataProvider>;
}
