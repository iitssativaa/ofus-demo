import { createClient } from "npm:@supabase/supabase-js@2";
import { getTelegramBot, sendTelegramMessage } from "../_shared/notification-adapters.ts";
import { readJsonBody, secretsMatch } from "../_shared/request-security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TelegramMessage = {
  text?: string;
  chat?: { id?: number | string };
  from?: { username?: string };
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function secretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!keys) return null;
  try {
    return Object.values(JSON.parse(keys) as Record<string, string>)[0] ?? null;
  } catch {
    return null;
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authenticatedUser(request: Request, supabaseUrl: string) {
  const authorization = request.headers.get("authorization");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!authorization || !publicKey) return null;
  const client = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

async function handleWebhook(request: Request, admin: ReturnType<typeof createClient>) {
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!await secretsMatch(request.headers.get("x-telegram-bot-api-secret-token"), expectedSecret)) {
    return json({ ok: false, error: "invalid_webhook_secret" }, 401);
  }

  const update = await readJsonBody<{ message?: TelegramMessage }>(request);
  const message = update?.message;
  const chatId = message?.chat?.id?.toString();
  const match = message?.text?.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{20,64})$/);
  if (!chatId || !match) return json({ ok: true, ignored: true });

  const tokenHash = await hashToken(match[1]);
  const { data, error } = await admin.rpc("consume_telegram_link_token", {
    target_token_hash: tokenHash,
    target_chat_id: chatId,
    target_username: message.from?.username ?? null,
  });
  const result = error ? "server_error" : data;
  const responseText: Record<string, string> = {
    connected: "✅ OfUs hesabın Telegram'a bağlandı.",
    expired: "Bu bağlantı kodunun süresi dolmuş. OfUs Ayarlar ekranından yeni bir bağlantı başlat.",
    used: "Bu bağlantı kodu daha önce kullanılmış. OfUs Ayarlar ekranından yeni bir kod oluştur.",
    chat_already_linked: "Bu Telegram hesabı başka bir OfUs kullanıcısına bağlı.",
    invalid: "Bağlantı kodu geçersiz. OfUs Ayarlar ekranından yeniden dene.",
    server_error: "Bağlantı şu anda tamamlanamadı. Lütfen daha sonra yeniden dene.",
  };
  await sendTelegramMessage(chatId, responseText[result] ?? responseText.server_error);
  return json({ ok: true, result });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = secretKey();
  if (!supabaseUrl || !adminKey) return json({ ok: false, error: "server_configuration_missing" }, 500);
  const admin = createClient(supabaseUrl, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (request.headers.has("x-telegram-bot-api-secret-token")) return handleWebhook(request, admin);

  const user = await authenticatedUser(request, supabaseUrl);
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);
  const body = await readJsonBody<{ action?: string }>(request);

  if (body?.action === "status") {
    const { data, error } = await admin.from("profiles")
      .select("telegram_chat_id, telegram_username, telegram_connected_at")
      .eq("id", user.id)
      .single();
    if (error) return json({ ok: false, error: "profile_not_found" }, 404);
    return json({
      ok: true,
      connection: {
        connected: Boolean(data.telegram_chat_id),
        username: data.telegram_username,
        connectedAt: data.telegram_connected_at,
      },
    });
  }

  if (body?.action === "create_link") {
    const bot = await getTelegramBot();
    if (!bot.ok) return json({ ok: false, error: bot.error }, 503);
    const token = randomToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await admin.from("telegram_link_tokens").delete().eq("user_id", user.id).is("used_at", null);
    const { error } = await admin.from("telegram_link_tokens").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (error) return json({ ok: false, error: "link_token_create_failed" }, 500);
    return json({ ok: true, botUrl: `https://t.me/${bot.username}?start=${token}`, expiresAt });
  }

  if (body?.action === "test") {
    const { data, error } = await admin.from("profiles").select("telegram_chat_id").eq("id", user.id).single();
    if (error || !data?.telegram_chat_id) return json({ ok: false, error: "telegram_not_connected" }, 409);
    const result = await sendTelegramMessage(data.telegram_chat_id, "✅ OfUs Telegram bildirimleri çalışıyor.");
    return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, 502);
  }

  if (body?.action === "disconnect") {
    const { error } = await admin.from("profiles").update({
      telegram_chat_id: null,
      telegram_username: null,
      telegram_connected_at: null,
    }).eq("id", user.id);
    if (error) return json({ ok: false, error: "disconnect_failed" }, 500);
    await admin.from("telegram_link_tokens").delete().eq("user_id", user.id).is("used_at", null);
    return json({ ok: true });
  }

  return json({ ok: false, error: "unsupported_action" }, 400);
});
