import { DetailRouteFrame } from "@/components/detail-route-frame";
import { ProjectsView } from "@/components/projects-view";
import { CompanyDetailView } from "@/components/company-detail-view";
import { ProjectDetailView } from "@/components/project-detail-view";
import { TaskCompletionDialog } from "@/components/task-completion-dialog";
import { TaskDeletionDialog } from "@/components/task-deletion-dialog";
import { TaskDetail } from "@/components/task-detail";
import { notFound } from "next/navigation";
import { TaskDataProvider } from "@/components/task-data-provider";
import { getProjectData } from "@/lib/supabase/business";
import { listTaskWorkspaceData, type TaskWorkspaceData } from "@/lib/supabase/tasks";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fromCompany?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
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
  const fromCompany = query.fromCompany === detailData.project?.companyId ? detailData.company : null;
  const returnHref = fromCompany ? `/companies/${fromCompany.id}` : "/projects";
  const background = fromCompany ? <CompanyDetailView company={fromCompany} projects={taskData.projects} linkedTaskCount={taskData.tasks.filter((task) => task.companyId === fromCompany.id).length} /> : <ProjectsView projects={taskData.projects} companies={taskData.companies} />;
  return <TaskDataProvider data={taskData}><DetailRouteFrame label="Proje detayı" returnHref={returnHref} background={background}><ProjectDetailView key={id} {...detailData} /><TaskDetail /><TaskCompletionDialog /><TaskDeletionDialog /></DetailRouteFrame></TaskDataProvider>;
}
