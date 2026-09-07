import type { CalendarRoutine, CalendarEventReminderPreset } from "@/lib/calendar-event-types";
import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { createClient } from "./server";

export async function listCalendarRoutines(): Promise<CalendarRoutine[]> {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  const supabase = await createClient();
  const [routinesResult, participantsResult, presetsResult] = await Promise.all([
    supabase.from("calendar_routines").select("*").eq("workspace_id", identity.workspaceId).order("created_at"),
    supabase.from("calendar_routine_participants").select("routine_id, user_id").eq("workspace_id", identity.workspaceId),
    supabase.from("calendar_routine_reminder_presets").select("routine_id, preset").eq("workspace_id", identity.workspaceId),
  ]);
  if (routinesResult.error) throw routinesResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (presetsResult.error) throw presetsResult.error;

  const participants = new Map<string, string[]>();
  for (const row of participantsResult.data) participants.set(row.routine_id, [...(participants.get(row.routine_id) ?? []), row.user_id]);
  const presets = new Map<string, CalendarEventReminderPreset[]>();
  for (const row of presetsResult.data) presets.set(row.routine_id, [...(presets.get(row.routine_id) ?? []), row.preset as CalendarEventReminderPreset]);

  return routinesResult.data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    recurrenceType: row.recurrence_type,
    recurrenceInterval: row.recurrence_interval,
    daysOfWeek: row.days_of_week ?? [],
    dayOfMonth: row.day_of_month ?? undefined,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? undefined,
    participantIds: participants.get(row.id) ?? [],
    reminders: presets.get(row.id) ?? [],
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
