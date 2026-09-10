import type { ReminderPreset } from "./types";

export type CalendarEventCategory = "work" | "social";
export type CalendarEventReminderPreset = Extract<ReminderPreset,
  "one_hour_before" | "six_hours_before" | "one_day_before" | "three_days_before" | "five_days_before"
>;

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  category: CalendarEventCategory;
  startsAt: string;
  endsAt?: string;
  participantIds: string[];
  reminders: CalendarEventReminderPreset[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isRoutineOccurrence: boolean;
  routineId?: string;
};

export type CalendarEventInput = {
  title: string;
  description: string;
  category: CalendarEventCategory;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
  reminders: CalendarEventReminderPreset[];
};

export type CalendarRoutineRecurrence = "daily" | "weekly" | "monthly";

export type CalendarRoutine = {
  id: string;
  title: string;
  description?: string;
  category: CalendarEventCategory;
  startTime: string;
  endTime?: string;
  recurrenceType: CalendarRoutineRecurrence;
  recurrenceInterval: number;
  daysOfWeek: number[];
  dayOfMonth?: number;
  startsOn: string;
  endsOn?: string;
  participantIds: string[];
  reminders: CalendarEventReminderPreset[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarRoutineInput = Omit<CalendarRoutine, "id" | "isActive" | "createdBy" | "createdAt" | "updatedAt">;
