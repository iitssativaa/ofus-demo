import type { CalendarEvent, CalendarEventReminderPreset } from "@/lib/calendar-event-types";
import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { createClient } from "./server";

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  const supabase = await createClient();
  const [eventsResult, participantsResult, remindersResult] = await Promise.all([
    supabase.from("calendar_events").select("*").eq("workspace_id", identity.workspaceId).is("deleted_at", null).order("starts_at"),
    supabase.from("calendar_event_participants").select("event_id, user_id").eq("workspace_id", identity.workspaceId),
    supabase.from("calendar_event_reminders").select("event_id, preset, status").eq("workspace_id", identity.workspaceId).neq("status", "cancelled"),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (remindersResult.error) throw remindersResult.error;

  const participants = new Map<string, string[]>();
  for (const row of participantsResult.data) participants.set(row.event_id, [...(participants.get(row.event_id) ?? []), row.user_id]);
  const reminders = new Map<string, CalendarEventReminderPreset[]>();
  for (const row of remindersResult.data) {
    const preset = row.preset as CalendarEventReminderPreset;
    const values = reminders.get(row.event_id) ?? [];
    if (!values.includes(preset)) reminders.set(row.event_id, [...values, preset]);
  }

  return eventsResult.data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    participantIds: participants.get(row.id) ?? [],
    reminders: reminders.get(row.id) ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRoutineOccurrence: row.is_routine_occurrence,
    routineId: row.routine_id ?? undefined,
  }));
}
