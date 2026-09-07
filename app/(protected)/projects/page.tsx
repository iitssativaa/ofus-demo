import { ProjectsView } from "@/components/projects-view";
import { listCompaniesAndProjects } from "@/lib/supabase/business";

export default async function ProjectsPage() {
  let props;
  try {
    props = await listCompaniesAndProjects();
  } catch (error) {
    console.error("Projects could not be loaded", error);
    props = { companies: [], projects: [], loadError: "Projeler yüklenemedi." };
  }
  return <ProjectsView {...props} />;
}
