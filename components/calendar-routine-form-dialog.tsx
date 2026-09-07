"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Repeat2, X } from "lucide-react";
import type { CalendarRoutine, CalendarRoutineInput, CalendarRoutineRecurrence, CalendarEventReminderPreset } from "@/lib/calendar-event-types";
import { localDate } from "@/lib/task-selectors";
import type { ReminderPreset, User } from "@/lib/types";
import { Checkbox } from "./checkbox";
import { ReminderPresetPicker } from "./reminder-preset-picker";
import { ThemedSelect } from "./themed-select";

const weekdays = [
  { value: 1, label: "Pzt" }, { value: 2, label: "Sal" }, { value: 3, label: "Çar" },
  { value: 4, label: "Per" }, { value: 5, label: "Cum" }, { value: 6, label: "Cmt" }, { value: 7, label: "Paz" },
];

export function CalendarRoutineFormDialog({ routine, users, saving, onCancel, onSave }: {
  routine?: CalendarRoutine;
  users: User[];
  saving: boolean;
  onCancel: () => void;
  onSave: (input: CalendarRoutineInput) => Promise<void>;
}) {
  const initial = useMemo<CalendarRoutineInput>(() => routine ? {
    title: routine.title, description: routine.description ?? "", category: routine.category,
    startTime: routine.startTime, endTime: routine.endTime ?? "", recurrenceType: routine.recurrenceType,
    recurrenceInterval: routine.recurrenceInterval, daysOfWeek: routine.daysOfWeek,
    dayOfMonth: routine.dayOfMonth, startsOn: routine.startsOn, endsOn: routine.endsOn ?? "",
    participantIds: routine.participantIds, reminders: routine.reminders,
  } : {
    title: "", description: "", category: "work", startTime: "09:00", endTime: "",
    recurrenceType: "weekly", recurrenceInterval: 1, daysOfWeek: [1], startsOn: localDate(), endsOn: "",
    participantIds: [], reminders: [],
  }, [routine]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const setField = <K extends keyof CalendarRoutineInput>(field: K, value: CalendarRoutineInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const close = () => { if (!lock.current && !saving) onCancel(); };
  const toggleParticipant = (id: string, checked: boolean) => setField("participantIds", checked
    ? [...new Set([...form.participantIds, id])]
    : form.participantIds.filter((value) => value !== id));
  const toggleWeekday = (day: number) => setField("daysOfWeek", form.daysOfWeek.includes(day)
    ? form.daysOfWeek.filter((value) => value !== day)
    : [...form.daysOfWeek, day].sort((a, b) => a - b));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return setError("Rutin adı boş bırakılamaz.");
    if (!form.startsOn || !form.startTime) return setError("Başlangıç tarihi ve saati seçmelisiniz.");
    if (form.endsOn && form.endsOn < form.startsOn) return setError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
    if (form.endTime && form.endTime <= form.startTime) return setError("Bitiş saati başlama saatinden sonra olmalıdır.");
    if (form.recurrenceType === "weekly" && !form.daysOfWeek.length) return setError("En az bir gün seçmelisiniz.");
    if (form.recurrenceType === "monthly" && (!form.dayOfMonth || form.dayOfMonth < 1 || form.dayOfMonth > 31)) return setError("Ayın 1–31 arasında bir gününü seçmelisiniz.");
    if (!form.participantIds.length) return setError("En az bir katılımcı seçmelisiniz.");
    if (lock.current || saving) return;
    lock.current = true;
    try { await onSave({ ...form, title: form.title.trim(), description: form.description?.trim(), recurrenceInterval: 1 }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Rutin kaydedilemedi."); lock.current = false; }
  };

  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="routine-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Rutin formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Repeat2 size={17} /></span><div><h2 id="routine-form-title" className="text-sm font-semibold text-slate-950">{routine ? "Rutini Düzenle" : "Rutin Ekle"}</h2><p className="text-xs text-slate-400">Tekrar düzenini ve katılımcıları belirleyin.</p></div></div><button type="button" disabled={saving} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Rutin Adı <span className="text-rose-500">*</span><input className="input" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Örn. Haftalık ekip planlama" /></label>
        <div className="field-label">Kategori <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Kategori" value={form.category} onValueChange={(value) => setField("category", value as CalendarRoutineInput["category"])} options={[{ value: "work", label: "İş" }, { value: "social", label: "Sosyal" }]} /></div>
        <div className="field-label">Tekrar <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Tekrar düzeni" value={form.recurrenceType} onValueChange={(value) => setField("recurrenceType", value as CalendarRoutineRecurrence)} options={[{ value: "daily", label: "Her Gün" }, { value: "weekly", label: "Her Hafta" }, { value: "monthly", label: "Her Ay" }]} /></div>
        {form.recurrenceType === "weekly" ? <fieldset className="sm:col-span-2"><legend className="field-label">Günler <span className="text-rose-500">*</span></legend><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map((day) => <button key={day.value} type="button" aria-pressed={form.daysOfWeek.includes(day.value)} onClick={() => toggleWeekday(day.value)} className={`min-h-10 rounded-lg border text-xs font-semibold transition ${form.daysOfWeek.includes(day.value) ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300"}`}>{day.label}</button>)}</div></fieldset> : null}
        {form.recurrenceType === "monthly" ? <label className="field-label sm:col-span-2">Her ayın günü <span className="text-rose-500">*</span><input type="number" min={1} max={31} className="input max-w-32" value={form.dayOfMonth ?? ""} onChange={(e) => setField("dayOfMonth", Number(e.target.value) || undefined)} /></label> : null}
        <label className="field-label">Başlangıç Tarihi <span className="text-rose-500">*</span><input type="date" className="input" value={form.startsOn} onChange={(e) => setField("startsOn", e.target.value)} /></label>
        <label className="field-label">Bitiş Tarihi<input type="date" className="input" min={form.startsOn} value={form.endsOn ?? ""} onChange={(e) => setField("endsOn", e.target.value)} /></label>
        <label className="field-label">Başlama Saati <span className="text-rose-500">*</span><input type="time" className="input" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} /></label>
        <label className="field-label">Bitiş Saati<input type="time" className="input" value={form.endTime ?? ""} onChange={(e) => setField("endTime", e.target.value)} /></label>
        <fieldset className="sm:col-span-2"><legend className="field-label">Katılımcılar <span className="text-rose-500">*</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.id} className="group flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"><Checkbox checked={form.participantIds.includes(user.id)} onChange={(checked) => toggleParticipant(user.id, checked)} ariaLabel={`${user.name} katılımcı`} />{user.name}</label>)}</div></fieldset>
        <ReminderPresetPicker compact value={form.reminders} onChange={(values: ReminderPreset[]) => setField("reminders", values as CalendarEventReminderPreset[])} disabled={saving} />
        <label className="field-label sm:col-span-2">Açıklama / Not<textarea className="input min-h-24 resize-none" maxLength={20000} value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} placeholder="Rutinle ilgili kısa not…" /></label>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={saving} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={saving} className="primary-button disabled:opacity-60">{saving ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}
