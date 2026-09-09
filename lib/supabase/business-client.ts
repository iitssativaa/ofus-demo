import type { CompanyInput, ProjectInput } from "@/lib/types";
import { normalizeResourceUrl, normalizeWebsiteUrl } from "@/lib/resource-links";
import { companyFromRow, projectFromRow, statusToDatabase, type CompanyRow } from "./business-models";
import { createClient } from "./client";
import { removeCompanyLogoObject, uploadCompanyLogo, validateCompanyLogo } from "./company-logos";

async function context() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");
  const { data: membership, error: membershipError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).order("joined_at").limit(1).single();
  if (membershipError || !membership) throw new Error("Çalışma alanı üyeliği bulunamadı.");
  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

const nullable = (value: string) => value.trim() || null;
const pendingCompanyCreations = new Map<string, Promise<CompanyRow>>();
const pendingLogoCleanup = new Map<string, Set<string>>();

async function cleanupLogoPaths(session: Awaited<ReturnType<typeof context>>, companyId: string, paths: string[] = []) {
  const key = `${session.workspaceId}/${companyId}`;
  const pending = pendingLogoCleanup.get(key) ?? new Set<string>();
  paths.forEach((path) => pending.add(path));
  pendingLogoCleanup.set(key, pending);
  for (const path of pending) {
    await removeCompanyLogoObject(session.supabase, path);
    pending.delete(path);
  }
  pendingLogoCleanup.delete(key);
}

function companyFields(input: CompanyInput) {
  const website = normalizeWebsiteUrl(input.website);
  if (input.website.trim() && !website) throw new Error("Geçerli bir web sitesi adresi girin.");
  const linkedinUrl = normalizeResourceUrl(input.linkedinUrl);
  if (input.linkedinUrl.trim() && (!linkedinUrl || linkedinUrl.length > 2048 || new URL(linkedinUrl).username || new URL(linkedinUrl).password)) {
    throw new Error("LinkedIn alanına geçerli bir http:// veya https:// adresi girin.");
  }
  return { name: input.name.trim(), contact_name: nullable(input.contactName), phone: input.phone.trim() ? input.phone : null, email: nullable(input.email), website, linkedin_url: linkedinUrl, notes: nullable(input.notes) };
}

async function saveCompany(input: CompanyInput, id: string, session: Awaited<ReturnType<typeof context>>) {
  const { supabase, workspaceId } = session;
  const fields = companyFields(input);
  await cleanupLogoPaths(session, id);
  const current = await supabase.from("companies").select("logo_url, updated_at").eq("workspace_id", workspaceId).eq("id", id).single();
  if (current.error) throw new Error("Firma bulunamadı veya düzenleme izniniz yok.");
  const previousPath = current.data.logo_url;
  const nextPath = input.logoFile ? await uploadCompanyLogo(supabase, workspaceId, id, input.logoFile)
    : input.logoFile === null ? null : previousPath;
  // Publish metadata and the durable logo reference together. A stale editor must retry.
  const { data, error } = await supabase.from("companies").update({ ...fields, logo_url: nextPath }).eq("workspace_id", workspaceId).eq("id", id).eq("updated_at", current.data.updated_at).select().maybeSingle();
  if (error || !data) {
    if (nextPath && nextPath !== previousPath) {
      try { await cleanupLogoPaths(session, id, [nextPath]); }
      catch { throw new Error("Firma kaydedilemedi ve yüklenen dosya temizlenemedi. Temizlemeyi yeniden denemek için tekrar Kaydet'e basın."); }
    }
    throw new Error(error ? "Firma bilgileri kaydedilemedi. Alanları kontrol edip tekrar deneyin." : "Firma başka bir işlemde güncellendi. Tekrar kaydedin.");
  }
  if (previousPath && previousPath !== nextPath) {
    try { await cleanupLogoPaths(session, id, [previousPath]); }
    catch { throw new Error("Firma bilgileri kaydedildi ancak önceki logo dosyası temizlenemedi. Temizlemeyi yeniden denemek için tekrar Kaydet'e basın."); }
  }
  return companyFromRow(data);
}

export async function createCompany(input: CompanyInput) {
  const session = await context();
  const fields = companyFields(input);
  if (input.logoFile) await validateCompanyLogo(input.logoFile);
  const key = `${session.userId}/${session.workspaceId}/${input.mutationId ?? crypto.randomUUID()}`;
  let creation = pendingCompanyCreations.get(key);
  const resuming = Boolean(creation);
  if (!creation) {
    // A form token is never treated as a company ID or as proof of a database conflict.
    creation = (async () => {
      const { data, error } = await session.supabase.from("companies").insert({ workspace_id: session.workspaceId, created_by: session.userId, ...fields }).select().single();
      if (error) throw new Error("Firma oluşturulamadı.");
      return data;
    })();
    pendingCompanyCreations.set(key, creation);
  }
  let row: CompanyRow;
  try { row = await creation; }
  catch (error) { pendingCompanyCreations.delete(key); throw error; }
  try {
    const company = !resuming && !input.logoFile ? companyFromRow(row) : await saveCompany(input, row.id, session);
    pendingCompanyCreations.delete(key);
    return company;
  }
  catch (saveError) {
    throw new Error(`Firma kaydı oluşturuldu; ${saveError instanceof Error ? saveError.message : "logo kaydedilemedi."} Aynı formda tekrar Kaydet'e basabilirsiniz.`);
  }
}

export async function updateCompany(id: string, input: CompanyInput) {
  return saveCompany(input, id, await context());
}

export async function deleteCompany(id: string) {
  const session = await context();
  const { supabase, workspaceId } = session;
  const [projects, tasks] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("company_id", id),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("company_id", id),
  ]);
  if (projects.error) throw projects.error;
  if (tasks.error) throw tasks.error;
  if ((projects.count ?? 0) || (tasks.count ?? 0)) throw new Error(`Bu firma silinemez. Firmaya bağlı ${projects.count ?? 0} proje ve ${tasks.count ?? 0} görev var.`);
  await cleanupLogoPaths(session, id);
  const company = await supabase.from("companies").select("logo_url").eq("workspace_id", workspaceId).eq("id", id).single();
  if (company.error) throw new Error("Firma bulunamadı.");
  if (company.data.logo_url) throw new Error("Firmayı silmeden önce Düzenle bölümünden logosunu kaldırıp kaydedin.");
  // Keep the company row (and its RLS access) until its remaining files are removed.
  const prefix = `${workspaceId}/${id}`;
  const remaining = await supabase.storage.from("company-logos").list(prefix, { limit: 100 });
  if (remaining.error) throw new Error("Firma logo dosyaları kontrol edilemedi.");
  if (remaining.data.length) {
    await cleanupLogoPaths(session, id, remaining.data.map((object) => `${prefix}/${object.name}`));
    if (remaining.data.length === 100) throw new Error("Logo dosyaları temizleniyor. Firma silme işlemini tekrar deneyin.");
  }
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
