import type { CompanyInput, ProjectInput } from "@/lib/types";
import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { companyFromRow, projectFromRow } from "./business-models";
import { createClient } from "./server";

async function context() {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  return { identity, supabase: await createClient() };
}

export async function listCompaniesAndProjects() {
  const { identity, supabase } = await context();
  const [companiesResult, projectsResult] = await Promise.all([
    supabase.from("companies").select("*").eq("workspace_id", identity.workspaceId).order("name"),
    supabase.from("projects").select("*").eq("workspace_id", identity.workspaceId).order("name"),
  ]);
  if (companiesResult.error) throw companiesResult.error;
  if (projectsResult.error) throw projectsResult.error;
  return {
    companies: companiesResult.data.map(companyFromRow),
    projects: projectsResult.data.map(projectFromRow),
  };
}

export async function getCompanyData(companyId: string) {
  const { identity, supabase } = await context();
  const [companyResult, projectsResult, tasksResult] = await Promise.all([
    supabase.from("companies").select("*").eq("workspace_id", identity.workspaceId).eq("id", companyId).maybeSingle(),
    supabase.from("projects").select("*").eq("workspace_id", identity.workspaceId).eq("company_id", companyId).order("name"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", identity.workspaceId).eq("company_id", companyId),
  ]);
  if (companyResult.error) throw companyResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  return {
    company: companyResult.data ? companyFromRow(companyResult.data) : null,
    projects: projectsResult.data.map(projectFromRow),
    linkedTaskCount: tasksResult.count ?? 0,
  };
}

export async function getProjectData(projectId: string) {
  const { identity, supabase } = await context();
  const projectResult = await supabase.from("projects").select("*").eq("workspace_id", identity.workspaceId).eq("id", projectId).maybeSingle();
  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) return { project: null, company: null, companies: [], linkedTaskCount: 0 };
  const [companyResult, companiesResult, tasksResult] = await Promise.all([
    supabase.from("companies").select("*").eq("workspace_id", identity.workspaceId).eq("id", projectResult.data.company_id).single(),
    supabase.from("companies").select("*").eq("workspace_id", identity.workspaceId).order("name"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", identity.workspaceId).eq("project_id", projectId),
  ]);
  if (companyResult.error) throw companyResult.error;
  if (companiesResult.error) throw companiesResult.error;
  if (tasksResult.error) throw tasksResult.error;
  return {
    project: projectFromRow(projectResult.data),
    company: companyFromRow(companyResult.data),
    companies: companiesResult.data.map(companyFromRow),
    linkedTaskCount: tasksResult.count ?? 0,
  };
}

export type { CompanyInput, ProjectInput };
