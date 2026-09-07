export type ResourceLinkType = "drive" | "figma" | "github" | "vercel" | "document" | "other";
export type ResourceOwnerType = "company" | "project" | "task";

export type ResourceLink = {
  id: string;
  companyId?: string;
  projectId?: string;
  taskId?: string;
  title: string;
  url: string;
  type: ResourceLinkType;
  note?: string;
  createdAt: string;
};

export type ResourceLinkInput = Pick<ResourceLink, "title" | "url" | "type" | "note">;

export const resourceTypeLabels: Record<ResourceLinkType, string> = {
  drive: "Google Drive", figma: "Figma", github: "GitHub", vercel: "Vercel", document: "Doküman", other: "Diğer",
};

export function normalizeResourceUrl(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch { return null; }
}

export function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return normalizeResourceUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
}
