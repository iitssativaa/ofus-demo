"use client";

import { Bell } from "lucide-react";
import { reminderPresets } from "@/lib/reminders";
import type { ReminderPreset } from "@/lib/types";
import { Checkbox } from "./checkbox";

export function ReminderPresetPicker({ value, onChange, disabled = false, compact = false }: {
  value: ReminderPreset[];
  onChange: (value: ReminderPreset[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const toggle = (preset: ReminderPreset) => {
    const current = reminderPresets.map((item) => item.value).filter((item) => value.includes(item));
    onChange(current.includes(preset) ? current.filter((item) => item !== preset) : [...current, preset]);
  };

  return <fieldset className={compact ? "sm:col-span-2" : ""} disabled={disabled}>
    <legend className="field-label flex items-center gap-1.5"><Bell size={13} />Hatırlatmalar</legend>
    <div className="mt-2 flex flex-wrap gap-2">
      {reminderPresets.map((preset) => <label key={preset.value} className="group inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <Checkbox checked={value.includes(preset.value)} disabled={disabled} onChange={() => toggle(preset.value)} />
        {preset.label}
      </label>)}
    </div>
    <p className="mt-2 text-[11px] leading-4 text-slate-400">Telegram gönderimi bağlantı kurulduktan sonra etkinleşecek.</p>
  </fieldset>;
}
