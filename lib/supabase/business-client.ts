import type { CompanyInput, ProjectInput } from "@/lib/types";
import { normalizeWebsiteUrl } from "@/lib/resource-links";
import { companyFromRow, projectFromRow, statusToDatabase } from "./business-models";
import { createClient } from "./client";

async function context() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");
  const { data: membership, error: membershipError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).order("joined_at").limit(1).single();
  if (membershipError || !membership) throw new Error("Çalışma alanı üyeliği bulunamadı.");
  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

const nullable = (value: string) => value.trim() || null;

export async function createCompany(input: CompanyInput) {
  const { supabase, userId, workspaceId } = await context();
  const website = normalizeWebsiteUrl(input.website);
  if (input.website.trim() && !website) throw new Error("Geçerli bir web sitesi adresi girin.");
  const { data, error } = await supabase.from("companies").insert({ workspace_id: workspaceId, created_by: userId, name: input.name.trim(), contact_name: nullable(input.contactName), phone: nullable(input.phone), email: nullable(input.email), website, notes: nullable(input.notes) }).select().single();
  if (error) throw error;
  return companyFromRow(data);
}

export async function updateCompany(id: string, input: CompanyInput) {
  const { supabase, workspaceId } = await context();
  const website = normalizeWebsiteUrl(input.website);
  if (input.website.trim() && !website) throw new Error("Geçerli bir web sitesi adresi girin.");
  const { data, error } = await supabase.from("companies").update({ name: input.name.trim(), contact_name: nullable(input.contactName), phone: nullable(input.phone), email: nullable(input.email), website, notes: nullable(input.notes) }).eq("workspace_id", workspaceId).eq("id", id).select().single();
  if (error) throw error;
  return companyFromRow(data);
}

export async function deleteCompany(id: string) {
  const { supabase, workspaceId } = await context();
  const [projects, tasks] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("company_id", id),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("company_id", id),
  ]);
  if (projects.error) throw projects.error;
  if (tasks.error) throw tasks.error;
  if ((projects.count ?? 0) || (tasks.count ?? 0)) throw new Error(`Bu firma silinemez. Firmaya bağlı ${projects.count ?? 0} proje ve ${tasks.count ?? 0} görev var.`);
  const { error } = await supabase.from("companies").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (error?.code === "23503") throw new Error("Bu firma bağlı proje veya görevleri bulunduğu için silinemez.");
  if (error) throw error;
}

export async function createProject(input: ProjectInput) {
  const { supabase, userId, workspaceId } = await context();
  const { data, error } = await supabase.from("projects").insert({ workspace_id: workspaceId, created_by: userId, company_id: input.companyId, name: input.name.trim(), description: input.description.trim(), status: statusToDatabase[input.status], notes: nullable(input.notes) }).select().single();
  if (error) throw error;
  return projectFromRow(data);
}

export async function updateProject(id: string, input: ProjectInput) {
  const { supabase, workspaceId } = await context();
  const { data, error } = await supabase.from("projects").update({ company_id: input.companyId, name: input.name.trim(), description: input.description.trim(), status: statusToDatabase[input.status], notes: nullable(input.notes) }).eq("workspace_id", workspaceId).eq("id", id).select().single();
  if (error) throw error;
  return projectFromRow(data);
}

export async function deleteProject(id: string) {
  const { supabase, workspaceId } = await context();
  const tasks = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("project_id", id);
  if (tasks.error) throw tasks.error;
  if (tasks.count) throw new Error(`Bu proje silinemez. Projeye bağlı ${tasks.count} görev var.`);
  const { error } = await supabase.from("projects").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (error?.code === "23503") throw new Error("Bu proje bağlı görevleri bulunduğu için silinemez.");
  if (error) throw error;
}
