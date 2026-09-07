"use client";

import type { ResourceLink, ResourceLinkInput, ResourceOwnerType } from "@/lib/resource-links";
import type { Database } from "./database.types";
import { createClient } from "./client";

type ResourceRow = Database["public"]["Tables"]["resource_links"]["Row"];
const ownerColumn = { company: "company_id", project: "project_id", task: "task_id" } as const;
const fromRow = (row: ResourceRow): ResourceLink => ({
  id: row.id, companyId: row.company_id ?? undefined, projectId: row.project_id ?? undefined, taskId: row.task_id ?? undefined,
  title: row.title, url: row.url, type: row.type, note: row.note ?? undefined, createdAt: row.created_at,
});

async function context() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");
  const { data: membership, error: membershipError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).order("joined_at").limit(1).single();
  if (membershipError || !membership) throw new Error("Çalışma alanı üyeliği bulunamadı.");
  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

export async function listResourceLinks(ownerType: ResourceOwnerType, ownerId: string) {
  const { supabase, workspaceId } = await context();
  const { data, error } = await supabase.from("resource_links").select("*").eq("workspace_id", workspaceId).eq(ownerColumn[ownerType], ownerId).order("created_at");
  if (error) throw error;
  return data.map(fromRow);
}

export async function createResourceLink(ownerType: ResourceOwnerType, ownerId: string, input: ResourceLinkInput) {
  const { supabase, userId, workspaceId } = await context();
  const owner = { company_id: null, project_id: null, task_id: null, [ownerColumn[ownerType]]: ownerId };
  const { data, error } = await supabase.from("resource_links").insert({ ...owner, workspace_id: workspaceId, created_by: userId, title: input.title.trim(), url: input.url, type: input.type, note: input.note?.trim() || null }).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateResourceLink(id: string, input: ResourceLinkInput) {
  const { supabase, workspaceId } = await context();
  const { data, error } = await supabase.from("resource_links").update({ title: input.title.trim(), url: input.url, type: input.type, note: input.note?.trim() || null }).eq("workspace_id", workspaceId).eq("id", id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteResourceLink(id: string) {
  const { supabase, workspaceId } = await context();
  const { error } = await supabase.from("resource_links").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (error) throw error;
}
