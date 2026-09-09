import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createClient } from "./client";

const bucket = "company-logos";
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const logoPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export async function validateCompanyLogo(file: File) {
  if (!extensions[file.type] || !file.size || file.size > 5 * 1024 * 1024) {
    throw new Error("Logo, en fazla 5 MB boyutunda JPG, PNG veya WebP olmalıdır.");
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validHeader = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!validHeader) throw new Error("Dosya içeriği seçilen görsel biçimiyle eşleşmiyor.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Logo dosyası okunamadı. Geçerli bir görsel seçin."); }
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error("Logo boyutları en fazla 8192 × 8192 piksel olabilir.");
  } finally { bitmap.close(); }
}

export async function resolveCompanyLogo(path: string): Promise<string | null> {
  if (!logoPath.test(path)) return null;
  const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}

export async function uploadCompanyLogo(supabase: SupabaseClient<Database>, workspaceId: string, companyId: string, file: File) {
  await validateCompanyLogo(file);
  const path = `${workspaceId}/${companyId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  if (!logoPath.test(path)) throw new Error("Logo depolama yolu geçersiz.");
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: "300", upsert: false });
  if (error) throw new Error("Logo yüklenemedi. Bağlantınızı kontrol edip tekrar kaydedin.");
  return path;
}

export async function removeCompanyLogoObject(supabase: SupabaseClient<Database>, path: string) {
  if (!logoPath.test(path)) throw new Error("Logo depolama yolu geçersiz.");
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error("Eski logo dosyası temizlenemedi.");
}
