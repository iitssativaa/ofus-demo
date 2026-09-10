"use client";

import type { CalendarEvent, CalendarEventInput } from "@/lib/calendar-event-types";
import { deadlineToIso } from "@/lib/task-selectors";
import { createClient } from "./client";

export async function listCalendarEventsClient(): Promise<CalendarEvent[]> {
  const supabase = createClient();
  const [eventsResult, participantsResult, remindersResult] = await Promise.all([
    supabase.from("calendar_events").select("*").is("deleted_at", null).order("starts_at"),
    supabase.from("calendar_event_participants").select("event_id, user_id"),
    supabase.from("calendar_event_reminders").select("event_id, preset, status").neq("status", "cancelled"),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (remindersResult.error) throw remindersResult.error;
  const participants = new Map<string, string[]>();
  for (const row of participantsResult.data) participants.set(row.event_id, [...(participants.get(row.event_id) ?? []), row.user_id]);
  const reminders = new Map<string, CalendarEvent["reminders"]>();
  for (const row of remindersResult.data) {
    const values = reminders.get(row.event_id) ?? [];
    const preset = row.preset as CalendarEvent["reminders"][number];
    if (!values.includes(preset)) reminders.set(row.event_id, [...values, preset]);
  }
  return eventsResult.data.map((row) => ({
    id: row.id, title: row.title, description: row.description ?? undefined, category: row.category,
    startsAt: row.starts_at, endsAt: row.ends_at ?? undefined,
    participantIds: participants.get(row.id) ?? [], reminders: reminders.get(row.id) ?? [],
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
    isRoutineOccurrence: row.is_routine_occurrence, routineId: row.routine_id ?? undefined,
  }));
}

function eventTimes(input: CalendarEventInput) {
  const startsAt = deadlineToIso(input.date, input.startTime);
  const endsAt = input.endTime ? deadlineToIso(input.endDate || input.date, input.endTime) : null;
  if (!startsAt) throw new Error("Geçerli bir tarih ve başlangıç saati seçmelisiniz.");
  if (input.endTime && (!endsAt || new Date(endsAt) <= new Date(startsAt))) throw new Error("Bitiş saati başlangıç saatinden sonra olmalıdır.");
  return { startsAt, endsAt };
}

function rowToEvent(row: {
  id: string; title: string; description: string | null; category: "work" | "social";
  starts_at: string; ends_at: string | null; created_by: string; created_at: string; updated_at: string;
  is_routine_occurrence?: boolean; routine_id?: string | null;
}, input: CalendarEventInput): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    participantIds: [...new Set(input.participantIds)],
    reminders: [...new Set(input.reminders)],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRoutineOccurrence: row.is_routine_occurrence ?? false,
    routineId: row.routine_id ?? undefined,
  };
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const { startsAt, endsAt } = eventTimes(input);
  const { data, error } = await createClient().rpc("create_calendar_event", {
    event_title: input.title.trim(), event_description: input.description.trim(), event_category: input.category,
    event_starts_at: startsAt, event_ends_at: endsAt ?? undefined, participant_ids: [...new Set(input.participantIds)], reminder_presets: [...new Set(input.reminders)],
  });
  if (error) throw error;
  return rowToEvent(data, input);
}

export async function updateCalendarEvent(id: string, input: CalendarEventInput) {
  const { startsAt, endsAt } = eventTimes(input);
  const { data, error } = await createClient().rpc("update_calendar_event", {
    target_event_id: id, event_title: input.title.trim(), event_description: input.description.trim(), event_category: input.category,
    event_starts_at: startsAt, event_ends_at: endsAt ?? undefined, participant_ids: [...new Set(input.participantIds)], reminder_presets: [...new Set(input.reminders)],
  });
  if (error) throw error;
  return rowToEvent(data, input);
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await createClient().rpc("delete_calendar_event", { target_event_id: id });
  if (error) throw error;
}
