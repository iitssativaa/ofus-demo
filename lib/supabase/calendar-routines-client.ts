"use client";

import type { CalendarRoutine, CalendarRoutineInput } from "@/lib/calendar-event-types";
import { createClient } from "./client";

function rowToRoutine(row: Record<string, unknown>, input: CalendarRoutineInput, isActive = true): CalendarRoutine {
  return {
    id: row.id as string,
    ...input,
    isActive,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function routineArgs(input: CalendarRoutineInput) {
  return {
    routine_title: input.title.trim(),
    routine_description: input.description?.trim() ?? "",
    routine_category: input.category,
    routine_start_time: input.startTime,
    routine_end_time: input.endTime || undefined,
    routine_recurrence_type: input.recurrenceType,
    routine_recurrence_interval: input.recurrenceInterval,
    routine_days_of_week: input.daysOfWeek,
    routine_day_of_month: input.dayOfMonth,
    routine_starts_on: input.startsOn,
    routine_ends_on: input.endsOn || undefined,
    participant_ids: [...new Set(input.participantIds)],
    reminder_presets: [...new Set(input.reminders)],
  };
}

export async function createCalendarRoutine(input: CalendarRoutineInput) {
  const { data, error } = await createClient().rpc("create_calendar_routine", routineArgs(input));
  if (error) throw error;
  return rowToRoutine(data as unknown as Record<string, unknown>, input);
}

export async function updateCalendarRoutine(id: string, input: CalendarRoutineInput) {
  const { data, error } = await createClient().rpc("update_calendar_routine", { target_routine_id: id, ...routineArgs(input) });
  if (error) throw error;
  return rowToRoutine(data as unknown as Record<string, unknown>, input, Boolean((data as { is_active?: boolean }).is_active));
}

export async function setCalendarRoutineActive(id: string, active: boolean) {
  const { data, error } = await createClient().rpc("set_calendar_routine_active", { target_routine_id: id, active });
  if (error) throw error;
  return data;
}

export async function deleteCalendarRoutine(id: string) {
  const { error } = await createClient().rpc("delete_calendar_routine", { target_routine_id: id });
  if (error) throw error;
}
