export type NotificationPayload = {
  reminderId: string;
  recipientUserId: string;
  recipientChatId: string | null;
  assigneeName: string;
  title: string;
  taskId: string;
  subjectType?: "task" | "event";
  dueAt: string;
  companyName: string | null;
  projectName: string | null;
  preset: "one_hour_before" | "six_hours_before" | "one_day_before" | "three_days_before" | "five_days_before" | "three_hours_before" | "at_deadline";
};

export type DeliveryResult =
  | { ok: true; providerMessageId: string; metadata?: Record<string, unknown> }
  | { ok: false; error: string; metadata?: Record<string, unknown> };

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  parameters?: { retry_after?: number };
};

function telegramError(response: TelegramResponse<unknown>): Extract<DeliveryResult, { ok: false }> {
  const error = response.error_code === 403
    ? "telegram_bot_blocked"
    : response.error_code === 400
      ? "telegram_invalid_chat"
      : response.error_code === 429
        ? "telegram_rate_limited"
        : "telegram_api_error";
  return {
    ok: false,
    error,
    metadata: {
      provider: "telegram",
      statusCode: response.error_code ?? null,
      retryAfter: response.parameters?.retry_after ?? null,
    },
  };
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>): Promise<TelegramResponse<T> | null> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json() as TelegramResponse<T>;
  } catch {
    return { ok: false };
  }
}

export async function getTelegramBot(): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const response = await telegramRequest<{ username?: string }>("getMe", {});
  if (!response) return { ok: false, error: "telegram_bot_token_missing" };
  if (!response.ok || !response.result?.username) return { ok: false, error: telegramError(response).error };
  return { ok: true, username: response.result.username };
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<DeliveryResult> {
  const response = await telegramRequest<{ message_id?: number }>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!response) return { ok: false, error: "telegram_bot_token_missing", metadata: { provider: "telegram" } };
  if (!response.ok || response.result?.message_id === undefined) return telegramError(response);
  return {
    ok: true,
    providerMessageId: response.result.message_id.toString(),
    metadata: { provider: "telegram" },
  };
}

function reminderContext(preset: NotificationPayload["preset"]) {
  if (preset === "one_hour_before") return "Hatırlatma: Son tarihe 1 saat kaldı";
  if (preset === "six_hours_before") return "Hatırlatma: Son tarihe 6 saat kaldı";
  if (preset === "one_day_before") return "Hatırlatma: Son tarihe 1 gün kaldı";
  if (preset === "three_days_before") return "Hatırlatma: Son tarihe 3 gün kaldı";
  if (preset === "five_days_before") return "Hatırlatma: Son tarihe 5 gün kaldı";
  if (preset === "three_hours_before") return "Hatırlatma: Son tarihe 3 saat kaldı";
  return "Hatırlatma: Son teslim zamanı geldi";
}

function formatDueAt(dueAt: string, timeZone: string) {
  try {
    const deadline = new Date(dueAt);
    const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone }).format(deadline);
    const time = new Intl.DateTimeFormat("tr-TR", { timeStyle: "short", timeZone }).format(deadline);
    return `${date}, ${time}`;
  } catch {
    return new Date(dueAt).toISOString();
  }
}

export function formatTelegramReminderMessage(payload: NotificationPayload, timeZone = "Europe/Istanbul") {
  const isEvent = payload.subjectType === "event";
  const contextLines = [
    `${isEvent ? "Etkinlik" : "Görev"}: ${payload.title}`,
    payload.companyName?.trim() ? `Firma: ${payload.companyName.trim()}` : null,
    payload.projectName?.trim() ? `Proje: ${payload.projectName.trim()}` : null,
  ].filter((line): line is string => Boolean(line));
  const text = [
    "🔔 OfUs",
    "",
    ...contextLines,
    "",
    `${isEvent ? "Başlangıç" : "Son teslim"}: ${formatDueAt(payload.dueAt, timeZone)}`,
    reminderContext(payload.preset),
    `${isEvent ? "Katılımcı" : "Sorumlu"}: ${payload.assigneeName}`,
  ].join("\n");
  return text;
}

export async function sendTelegramNotification(payload: NotificationPayload): Promise<DeliveryResult> {
  if (!payload.recipientChatId) {
    return { ok: false, error: "telegram_not_connected", metadata: { provider: "telegram" } };
  }
  const timeZone = Deno.env.get("TELEGRAM_TIME_ZONE") || "Europe/Istanbul";
  const text = formatTelegramReminderMessage(payload, timeZone);
  return sendTelegramMessage(payload.recipientChatId, text);
}

export async function deliverNotification(channel: string, payload: NotificationPayload): Promise<DeliveryResult> {
  if (channel === "telegram") return sendTelegramNotification(payload);
  return { ok: false, error: "unsupported_channel", metadata: { channel } };
}
