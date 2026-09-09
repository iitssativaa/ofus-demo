import type { Company, Project } from "@/lib/types";
import type { Database } from "./database.types";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];

const colors = ["#4f46e5", "#0f766e", "#b45309", "#be123c", "#0369a1", "#7e22ce"];

export function companyFromRow(row: CompanyRow): Company {
  let hash = 0;
  for (const character of row.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return { id: row.id, name: row.name, color: colors[hash % colors.length], contactName: row.contact_name ?? "", phone: row.phone ?? "", email: row.email ?? "", website: row.website ?? "", linkedinUrl: row.linkedin_url ?? "", logoUrl: row.logo_url, notes: row.notes ?? "" };
}

const statusFromDatabase: Record<ProjectStatus, Project["status"]> = { active: "Active", on_hold: "On hold", wrapping_up: "Wrapping up" };
export const statusToDatabase: Record<Project["status"], ProjectStatus> = { Active: "active", "On hold": "on_hold", "Wrapping up": "wrapping_up" };

export function projectFromRow(row: ProjectRow): Project {
  return { id: row.id, name: row.name, companyId: row.company_id, status: statusFromDatabase[row.status], description: row.description, notes: row.notes ?? "" };
}
