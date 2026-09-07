import type { ReminderPreset } from "@/lib/types";

export const reminderPresets: { value: ReminderPreset; label: string }[] = [
  { value: "one_hour_before", label: "1 saat önce" },
  { value: "six_hours_before", label: "6 saat önce" },
  { value: "one_day_before", label: "1 gün önce" },
  { value: "three_days_before", label: "3 gün önce" },
  { value: "five_days_before", label: "5 gün önce" },
];
