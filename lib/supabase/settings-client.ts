"use client";

import { createClient } from "./client";
import type { TelegramConnection } from "./settings";

const avatarBucket = "avatars";
const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const avatarMaxBytes = 5 * 1024 * 1024;

export function validateAvatarFile(file: File) {
  if (!avatarMimeTypes.has(file.type)) throw new Error("Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
  if (file.size > avatarMaxBytes) throw new Error("Profil fotoğrafı en fazla 5 MB olabilir.");
}

const versionedAvatarUrl = (url: string | null) => url ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}` : null;

async function authenticatedAvatarContext() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Oturum bulunamadı.");
  return { supabase, user, path: `${user.id}/avatar` };
}

export async function uploadOwnAvatar(file: File) {
  validateAvatarFile(file);
  const { supabase, user, path } = await authenticatedAvatarContext();
  const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(path, file, {
    cacheControl: "0",
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) throw new Error("Profil fotoğrafı yüklenemedi.");

  const { data: publicUrl } = supabase.storage.from(avatarBucket).getPublicUrl(path);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id)
    .select("id, display_name, avatar_url")
    .single();
  if (profileError || !profile) throw new Error("Profil fotoğrafı kaydedilemedi.");
  return { ...profile, avatar_url: versionedAvatarUrl(profile.avatar_url) };
}

export async function removeOwnAvatar() {
  const { supabase, user, path } = await authenticatedAvatarContext();
  const { error: removeError } = await supabase.storage.from(avatarBucket).remove([path]);
  if (removeError) throw new Error("Profil fotoğrafı depolamadan kaldırılamadı.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
    .select("id, display_name, avatar_url")
    .single();
  if (profileError || !profile) throw new Error("Profil fotoğrafı kaldırılamadı.");
  return profile;
}

const telegramErrors: Record<string, string> = {
  telegram_bot_token_missing: "Telegram botu henüz yapılandırılmadı.",
  telegram_api_error: "Telegram servisine ulaşılamadı.",
  telegram_rate_limited: "Telegram istek sınırına ulaşıldı. Lütfen biraz sonra yeniden deneyin.",
  telegram_bot_blocked: "Bot Telegram'da engellenmiş.",
  telegram_invalid_chat: "Telegram bağlantısı geçersiz görünüyor.",
  telegram_not_connected: "Telegram hesabınız bağlı değil.",
  link_token_create_failed: "Bağlantı kodu oluşturulamadı.",
  disconnect_failed: "Telegram bağlantısı kaldırılamadı.",
  unauthorized: "Oturum bulunamadı.",
};

async function invokeTelegram<T>(action: string): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("telegram-integration", { body: { action } });
  let code = data?.error as string | undefined;
  const context = error && "context" in error ? (error as { context?: Response }).context : undefined;
  if (!code && context) {
    const responseBody = await context.clone().json().catch(() => null) as { error?: string } | null;
    code = responseBody?.error;
  }
  if (error || data?.ok === false) throw new Error(telegramErrors[code ?? ""] ?? "Telegram işlemi tamamlanamadı.");
  return data as T;
}

export async function createTelegramLink() {
  return invokeTelegram<{ ok: true; botUrl: string; expiresAt: string }>("create_link");
}

export async function getTelegramConnection() {
  const data = await invokeTelegram<{ ok: true; connection: TelegramConnection }>("status");
  return data.connection;
}

export async function sendTelegramTestMessage() {
  await invokeTelegram<{ ok: true }>("test");
}

export async function disconnectTelegram() {
  await invokeTelegram<{ ok: true }>("disconnect");
}

export async function updateOwnProfile(displayName: string) {
  const normalizedName = displayName.trim();
  if (!normalizedName) throw new Error("Görünen ad boş bırakılamaz.");
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: normalizedName })
    .eq("id", user.id)
    .select("id, display_name, avatar_url")
    .single();
  if (error || !data) throw error ?? new Error("Profil kaydedilemedi.");
  return { ...data, avatar_url: versionedAvatarUrl(data.avatar_url) };
}
