"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarPlus, X } from "lucide-react";
import type { CalendarEvent, CalendarEventInput, CalendarEventReminderPreset } from "@/lib/calendar-event-types";
import { localDate, localTime } from "@/lib/task-selectors";
import type { ReminderPreset, User } from "@/lib/types";
import { Checkbox } from "./checkbox";
import { ReminderPresetPicker } from "./reminder-preset-picker";
import { ThemedSelect } from "./themed-select";

export function CalendarEventFormDialog({ event, initialDate, users, timeZone, saving, onCancel, onSave }: {
  event?: CalendarEvent;
  initialDate: string;
  users: User[];
  timeZone: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: CalendarEventInput) => Promise<void>;
}) {
  const initial = useMemo<CalendarEventInput>(() => event ? {
    title: event.title,
    description: event.description ?? "",
    category: event.category,
    date: localDate(event.startsAt, timeZone),
    startTime: localTime(event.startsAt, timeZone),
    endTime: event.endsAt ? localTime(event.endsAt, timeZone) : "",
    participantIds: event.participantIds,
    reminders: event.reminders,
  } : {
    title: "", description: "", category: "work", date: initialDate, startTime: "09:00", endTime: "", participantIds: [], reminders: [],
  }, [event, initialDate, timeZone]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !saving) onCancel(); };
  const setField = <K extends keyof CalendarEventInput>(field: K, value: CalendarEventInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };
  const toggleParticipant = (id: string, checked: boolean) => setField("participantIds", checked
    ? [...new Set([...form.participantIds, id])]
    : form.participantIds.filter((participantId) => participantId !== id));
  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!form.title.trim()) return setError("Etkinlik adı boş bırakılamaz.");
    if (!form.date) return setError("Tarih seçmelisiniz.");
    if (!form.startTime) return setError("Başlangıç saati seçmelisiniz.");
    if (!form.participantIds.length) return setError("En az bir katılımcı seçmelisiniz.");
    if (form.endTime && form.endTime <= form.startTime) return setError("Bitiş saati başlangıç saatinden sonra olmalıdır.");
    if (submissionLock.current || saving) return;
    submissionLock.current = true;
    try { await onSave({ ...form, title: form.title.trim(), description: form.description.trim() }); }
    catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Etkinlik kaydedilemedi.");
      submissionLock.current = false;
    }
  };

  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="calendar-event-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Etkinlik formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><CalendarPlus size={17} /></span><div><h2 id="calendar-event-form-title" className="text-sm font-semibold text-slate-950">{event ? "Etkinliği Düzenle" : "Etkinlik Ekle"}</h2><p className="text-xs text-slate-400">Etkinlik zamanını, katılımcıları ve hatırlatmaları belirleyin.</p></div></div>
        <button type="button" disabled={saving} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button>
      </header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Etkinlik adı <span className="text-rose-500">*</span><input className="input" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Örn. Haftalık planlama" aria-invalid={Boolean(error && !form.title.trim())} /></label>
        <div className="field-label sm:col-span-2">Kategori <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Kategori" value={form.category} onValueChange={(value) => setField("category", value as CalendarEventInput["category"])} options={[{ value: "work", label: "İş" }, { value: "social", label: "Sosyal" }]} /></div>
        <label className="field-label">Tarih <span className="text-rose-500">*</span><input type="date" className="input" value={form.date} onChange={(e) => setField("date", e.target.value)} /></label>
        <label className="field-label">Başlangıç saati <span className="text-rose-500">*</span><input type="time" className="input" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} /></label>
        <label className="field-label">Bitiş saati<input type="time" className="input" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} /></label>
        <fieldset className="sm:col-span-2"><legend className="field-label">Katılımcılar <span className="text-rose-500">*</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.id} className="group flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"><Checkbox checked={form.participantIds.includes(user.id)} onChange={(checked) => toggleParticipant(user.id, checked)} ariaLabel={`${user.name} katılımcı`} />{user.name}</label>)}</div></fieldset>
        <ReminderPresetPicker compact value={form.reminders} onChange={(values: ReminderPreset[]) => setField("reminders", values as CalendarEventReminderPreset[])} disabled={saving} />
        <label className="field-label sm:col-span-2">Not<textarea className="input min-h-24 resize-none" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Etkinlikle ilgili kısa not…" /></label>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={saving} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={saving} className="primary-button">{saving ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}
