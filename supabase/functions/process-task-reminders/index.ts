import { createClient } from "npm:@supabase/supabase-js@2";
import { deliverNotification, type NotificationPayload } from "../_shared/notification-adapters.ts";
import { secretsMatch } from "../_shared/request-security.ts";

type ClaimedReminder = {
  reminder_id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  channel: string;
  attempt_number: number;
  task_title: string;
  due_at: string;
  company_name: string | null;
  project_name: string | null;
};

type ClaimedEventReminder = {
  reminder_id: string;
  workspace_id: string;
  event_id: string;
  user_id: string;
  channel: string;
  preset: NotificationPayload["preset"];
  attempt_number: number;
  event_title: string;
  starts_at: string;
};

type ReminderJob = {
  kind: "task" | "event";
  reminderId: string;
  userId: string;
  channel: string;
  attemptNumber: number;
  subjectId: string;
  title: string;
  dueAt: string;
  companyName: string | null;
  projectName: string | null;
  preset?: NotificationPayload["preset"];
};

type RecipientProfile = {
  id: string;
  display_name: string;
  telegram_chat_id: string | null;
};

type ReminderPresetRow = {
  id: string;
  preset: NotificationPayload["preset"];
};

function secretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!keys) return null;
  try {
    const parsed = JSON.parse(keys) as Record<string, string>;
    return Object.values(parsed)[0] ?? null;
  } catch {
    return null;
  }
}

function payloadFor(reminder: ReminderJob, profile?: RecipientProfile, preset?: ReminderPresetRow["preset"]): NotificationPayload {
  return {
    reminderId: reminder.reminderId,
    recipientUserId: reminder.userId,
    recipientChatId: profile?.telegram_chat_id ?? null,
    assigneeName: profile?.display_name ?? "Ad bilgisi yok",
    title: reminder.title,
    taskId: reminder.subjectId,
    subjectType: reminder.kind,
    dueAt: reminder.dueAt,
    companyName: reminder.companyName,
    projectName: reminder.projectName,
    preset: reminder.preset ?? preset ?? "at_deadline",
  };
}

async function isStillDeliverable(supabase: ReturnType<typeof createClient>, reminder: ReminderJob) {
  if (reminder.kind === "task") {
    const [{ data: reminderState, error: reminderError }, { data: task, error: taskError }] = await Promise.all([
      supabase.from("task_reminders").select("status, attempt_count").eq("id", reminder.reminderId).maybeSingle(),
      supabase.from("tasks").select("status").eq("id", reminder.subjectId).maybeSingle(),
    ]);
    if (reminderError || taskError) {
      console.error("task reminder pre-delivery check failed", reminder.reminderId);
      return false;
    }
    return reminderState?.status === "processing"
      && reminderState.attempt_count === reminder.attemptNumber
      && task?.status !== "completed"
      && task?.status !== "cancelled";
  }

  const [{ data: reminderState, error: reminderError }, { data: event, error: eventError }] = await Promise.all([
    supabase.from("calendar_event_reminders").select("status, attempt_count").eq("id", reminder.reminderId).maybeSingle(),
    supabase.from("calendar_events").select("deleted_at").eq("id", reminder.subjectId).maybeSingle(),
  ]);
  if (reminderError || eventError) {
    console.error("event reminder pre-delivery check failed", reminder.reminderId);
    return false;
  }
  return reminderState?.status === "processing"
    && reminderState.attempt_count === reminder.attemptNumber
    && event?.deleted_at === null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expectedCronSecret = Deno.env.get("REMINDER_CRON_SECRET");
  if (!await secretsMatch(request.headers.get("x-reminder-cron-secret"), expectedCronSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = secretKey();
  if (!supabaseUrl || !adminKey) return new Response("Server configuration missing", { status: 500 });

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: materializeError } = await supabase.rpc("materialize_calendar_routine_occurrences", { horizon_days: 90 });
  if (materializeError) console.error("calendar routine materialization failed", materializeError.message);
  const [taskClaim, eventClaim] = await Promise.all([
    supabase.rpc("claim_due_reminders", { batch_size: 25 }),
    supabase.rpc("claim_due_calendar_event_reminders", { batch_size: 25 }),
  ]);
  if (taskClaim.error) console.error("claim_due_reminders failed", taskClaim.error.message);
  if (eventClaim.error) console.error("claim_due_calendar_event_reminders failed", eventClaim.error.message);
  if (taskClaim.error && eventClaim.error) {
    return Response.json({ ok: false, error: "claim_failed" }, { status: 500 });
  }

  const taskJobs: ReminderJob[] = ((taskClaim.data ?? []) as ClaimedReminder[]).map((reminder) => ({
    kind: "task", reminderId: reminder.reminder_id, userId: reminder.user_id, channel: reminder.channel,
    attemptNumber: reminder.attempt_number, subjectId: reminder.task_id, title: reminder.task_title,
    dueAt: reminder.due_at, companyName: reminder.company_name, projectName: reminder.project_name,
  }));
  const eventJobs: ReminderJob[] = ((eventClaim.data ?? []) as ClaimedEventReminder[]).map((reminder) => ({
    kind: "event", reminderId: reminder.reminder_id, userId: reminder.user_id, channel: reminder.channel,
    attemptNumber: reminder.attempt_number, subjectId: reminder.event_id, title: reminder.event_title,
    dueAt: reminder.starts_at, companyName: null, projectName: null, preset: reminder.preset,
  }));
  const claimed = [...taskJobs, ...eventJobs];
  const userIds = [...new Set(claimed.map((reminder) => reminder.userId))];
  const reminderIds = taskJobs.map((reminder) => reminder.reminderId);
  const [{ data: profiles, error: profileError }, { data: reminderRows, error: reminderError }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, display_name, telegram_chat_id").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    reminderIds.length
      ? supabase.from("task_reminders").select("id, preset").in("id", reminderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError || reminderError) {
    console.error("reminder context resolution failed", profileError?.message ?? reminderError?.message);
  }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile as RecipientProfile]));
  const presetsById = new Map((reminderRows ?? []).map((reminder) => [reminder.id, (reminder as ReminderPresetRow).preset]));
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of claimed) {
    if (!await isStillDeliverable(supabase, reminder)) {
      skipped += 1;
      continue;
    }
    const result = await deliverNotification(
      reminder.channel,
      payloadFor(reminder, profilesById.get(reminder.userId), presetsById.get(reminder.reminderId)),
    );
    const finishFunction = reminder.kind === "event" ? "finish_calendar_event_reminder_attempt" : "finish_reminder_attempt";
    const { error: finishError } = await supabase.rpc(finishFunction, {
      target_reminder_id: reminder.reminderId,
      target_attempt_number: reminder.attemptNumber,
      delivery_succeeded: result.ok,
      delivery_error: result.ok ? null : result.error,
      external_message_id: result.ok ? result.providerMessageId : null,
      delivery_metadata: result.metadata ?? {},
    });

    if (finishError) {
      console.error(`${finishFunction} failed`, reminder.reminderId, finishError.message);
      failed += 1;
    } else if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return Response.json({ ok: true, claimed: claimed.length, sent, failed, skipped });
});
