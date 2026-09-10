"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarPlus, Plus, X } from "lucide-react";
import type { CalendarEvent, CalendarEventInput, CalendarEventReminderPreset } from "@/lib/calendar-event-types";
import { localDate, localTime } from "@/lib/task-selectors";
import type { ReminderPreset, User } from "@/lib/types";
import { Checkbox } from "./checkbox";
import { ReminderPresetPicker } from "./reminder-preset-picker";
import { useDialogFocus } from "./use-dialog-focus";
import { useFormDrafts } from "./form-draft-provider";
import { useDialogExit } from "./use-dialog-exit";
import "./detail-fidelity.css";

export const calendarEventCreateDraftKey = "calendar-event:create";

export function CalendarEventFormDialog({ event, initialDate, users, timeZone, saving, onCancel, onSave }: {
  event?: CalendarEvent;
  initialDate: string;
  users: User[];
  timeZone: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: CalendarEventInput) => Promise<void>;
}) {
  const drafts = useFormDrafts();
  const { closing, requestClose } = useDialogExit();
  const initial = useMemo<CalendarEventInput>(() => event ? {
    title: event.title,
    description: event.description ?? "",
    category: event.category,
    date: localDate(event.startsAt, timeZone),
    endDate: event.endsAt ? localDate(event.endsAt, timeZone) : localDate(event.startsAt, timeZone),
    startTime: localTime(event.startsAt, timeZone),
    endTime: event.endsAt ? localTime(event.endsAt, timeZone) : "",
    participantIds: event.participantIds,
    reminders: event.reminders,
  } : drafts.get<CalendarEventInput>(calendarEventCreateDraftKey) ?? {
    title: "", description: "", category: "work", date: initialDate, endDate: initialDate, startTime: "10:00", endTime: "11:00", participantIds: [], reminders: [],
  }, [event, initialDate, timeZone, drafts]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !saving) { if (!event) drafts.set(calendarEventCreateDraftKey, form); requestClose(onCancel); } };
  const discard = () => { if (!submissionLock.current && !saving) { if (!event) drafts.clear(calendarEventCreateDraftKey); requestClose(onCancel); } };
  useDialogFocus(true, close);
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
    if (!form.endDate) return setError("Bitiş tarihi seçmelisiniz.");
    if (!form.startTime) return setError("Başlangıç saati seçmelisiniz.");
    if (!event && !form.endTime) return setError("Bitiş saati seçmelisiniz.");
    if (!form.participantIds.length) return setError("En az bir katılımcı seçmelisiniz.");
    if (form.endDate < form.date) return setError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
    if (form.endTime && `${form.endDate}T${form.endTime}` <= `${form.date}T${form.startTime}`) return setError("Bitiş tarih ve saati başlangıçtan sonra olmalıdır.");
    if (submissionLock.current || saving) return;
    submissionLock.current = true;
    try { await onSave({ ...form, title: form.title.trim(), description: form.description.trim() }); if (!event) drafts.clear(calendarEventCreateDraftKey); }
    catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Etkinlik kaydedilemedi.");
      submissionLock.current = false;
    }
  };

  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="calendar-event-form-title" inert={closing} style={{ opacity: closing ? 0 : 1, transition: "opacity 200ms ease" }}>
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Etkinlik formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel ofus-reference-form max-w-[720px]" style={{ transform: closing ? "translateY(8px)" : undefined, transition: "transform 200ms ease" }}>
      <header className="flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-sky-50 p-3 text-sky-500"><CalendarPlus size={19} /></span><div><h2 id="calendar-event-form-title" className="font-semibold text-slate-950">{event ? "Etkinliği düzenle" : "Yeni etkinlik ekle"}</h2><p className="text-slate-400">Bir araya gelmek için takvimde yer aç.</p></div></div>
        <button type="button" disabled={saving} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button>
      </header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Etkinlik adı <span className="text-rose-500">*</span><input className="input ofus-reference-title-input" maxLength={event ? undefined : 140} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Örn. Haftalık planlama" aria-invalid={Boolean(error && !form.title.trim())} /></label>
        <fieldset className="sm:col-span-2"><legend className="field-label">Etkinlik türü</legend><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="ofus-reference-choice" data-category="work" data-active={form.category === "work"} aria-pressed={form.category === "work"} onClick={() => setField("category", "work")}>●&nbsp; İş etkinliği</button><button type="button" className="ofus-reference-choice" data-category="social" data-active={form.category === "social"} aria-pressed={form.category === "social"} onClick={() => setField("category", "social")}>●&nbsp; Sosyal etkinlik</button></div></fieldset>
        <div className="ofus-reference-date-group"><label className="field-label">Başlangıç tarihi <span className="text-rose-500">*</span><input type="date" className="input" value={form.date} onChange={(e) => setField("date", e.target.value)} /></label><label className="field-label">Saat <span className="text-rose-500">*</span><input type="time" aria-label="Başlangıç saati" className="input" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} /></label></div>
        <div className="ofus-reference-date-group"><label className="field-label">Bitiş tarihi <span className="text-rose-500">*</span><input type="date" className="input" value={form.endDate ?? form.date} onChange={(e) => setField("endDate", e.target.value)} /></label><label className="field-label">Saat {!event ? <span className="text-rose-500">*</span> : null}<input type="time" aria-label="Bitiş saati" className="input" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} /></label></div>
        <fieldset className="sm:col-span-2"><legend className="field-label">Katılımcılar <span className="text-rose-500">*</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.id} className="choice-card group flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"><Checkbox checked={form.participantIds.includes(user.id)} onChange={(checked) => toggleParticipant(user.id, checked)} ariaLabel={`${user.name} katılımcı`} />{user.name}</label>)}</div></fieldset>
        <ReminderPresetPicker compact value={form.reminders} onChange={(values: ReminderPreset[]) => setField("reminders", values as CalendarEventReminderPreset[])} disabled={saving} />
        <label className="field-label sm:col-span-2">Not<textarea className="input ofus-reference-event-note resize-none" maxLength={event ? undefined : 2000} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Etkinlikle ilgili kısa not…" /></label>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer items-center"><span className="mr-auto hidden text-[11px] text-slate-400 sm:block">* Gerekli alan</span><button type="button" disabled={saving} onClick={discard} className="secondary-button">Vazgeç</button><button type="submit" disabled={saving} className="primary-button"><Plus size={15} />{saving ? "Kaydediliyor…" : event ? "Etkinliği Kaydet" : "Etkinlik Ekle"}</button></footer>
    </form>
  </div>;
}

