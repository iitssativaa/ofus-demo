"use client";

import { useRef, useState } from "react";
import { Bell, CalendarClock, Pause, Pencil, Play, Plus, Repeat2, Trash2, Users, X } from "lucide-react";
import type { CalendarRoutine, CalendarRoutineInput } from "@/lib/calendar-event-types";
import { reminderPresets } from "@/lib/reminders";
import type { User } from "@/lib/types";
import { createCalendarRoutine, deleteCalendarRoutine, setCalendarRoutineActive, updateCalendarRoutine } from "@/lib/supabase/calendar-routines-client";
import { CalendarRoutineFormDialog } from "./calendar-routine-form-dialog";

const weekdayNames = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
function recurrenceSummary(routine: CalendarRoutine) {
  if (routine.recurrenceType === "daily") return `Her gün · ${routine.startTime}`;
  if (routine.recurrenceType === "monthly") return `Her ayın ${routine.dayOfMonth}. günü · ${routine.startTime}`;
  return `${routine.daysOfWeek.map((day) => weekdayNames[day]).join(" & ")} · ${routine.startTime}`;
}

export function CalendarRoutineManager({ routines, onRoutinesChange, users, requestedEdit, onRequestedEditHandled, onOccurrencesChanged }: {
  routines: CalendarRoutine[];
  onRoutinesChange: (routines: CalendarRoutine[]) => void;
  users: User[];
  requestedEdit?: CalendarRoutine;
  onRequestedEditHandled: () => void;
  onOccurrencesChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<CalendarRoutine | null | undefined>(requestedEdit);
  const [deleting, setDeleting] = useState<CalendarRoutine | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const actionLock = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (actionLock.current || saving) return;
    actionLock.current = true;
    setSaving(true);
    setError("");
    try {
      await action();
      try { await onOccurrencesChanged(); }
      catch (refreshError) {
        console.error("Routine occurrences could not be refreshed", refreshError);
        setError("Rutin kaydedildi ancak takvim oluşumları yenilenemedi. Sayfayı yenileyin.");
      }
    } catch (cause) {
      console.error("Routine operation failed", cause);
      const message = "Rutin işlemi tamamlanamadı. Lütfen tekrar deneyin.";
      setError(message);
      throw new Error(message);
    }
    finally { actionLock.current = false; setSaving(false); }
  };
  const save = async (input: CalendarRoutineInput) => run(async () => {
    if (editing) {
      const updated = await updateCalendarRoutine(editing.id, input);
      onRoutinesChange(routines.map((item) => item.id === updated.id ? updated : item));
    } else {
      const created = await createCalendarRoutine(input);
      onRoutinesChange([...routines, created]);
    }
    setEditing(undefined);
    onRequestedEditHandled();
  });
  const toggle = (routine: CalendarRoutine) => run(async () => {
    await setCalendarRoutineActive(routine.id, !routine.isActive);
    onRoutinesChange(routines.map((item) => item.id === routine.id ? { ...item, isActive: !item.isActive } : item));
  });
  const remove = () => deleting ? run(async () => {
    await deleteCalendarRoutine(deleting.id);
    onRoutinesChange(routines.filter((item) => item.id !== deleting.id));
    setDeleting(null);
  }) : Promise.resolve();

  return <section className="panel overflow-hidden">
    <div className="panel-header"><div><h2 className="section-title">Rutinler</h2><p className="section-subtitle">Tekrarlanan etkinlik planları</p></div><button type="button" onClick={() => setEditing(null)} className="primary-button"><Plus size={15} />Rutin Ekle</button></div>
    {error ? <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p> : null}
    {!routines.length ? <div className="p-10 text-center"><Repeat2 className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">Henüz rutin yok.</p><p className="mt-1 text-xs text-slate-400">Tekrarlanan bir plan ekleyebilirsiniz.</p></div> : <div className="divide-y divide-slate-100">{routines.map((routine) => {
      const participantNames = routine.participantIds.map((id) => users.find((user) => user.id === id)?.name).filter(Boolean).join(", ");
      const reminderSummary = routine.reminders.map((value) => reminderPresets.find((item) => item.value === value)?.label).filter(Boolean).join(", ");
      return <article key={routine.id} className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${routine.isActive ? "" : "opacity-60"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${routine.category === "work" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}><Repeat2 size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{routine.title}</h3><span className="status-badge">{routine.category === "work" ? "İş" : "Sosyal"}</span><span className="status-badge">{routine.isActive ? "Aktif" : "Duraklatıldı"}</span></div><p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarClock size={13} />{recurrenceSummary(routine)}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400"><span className="flex items-center gap-1"><Users size={12} />{participantNames}</span><span className="flex items-center gap-1"><Bell size={12} />{reminderSummary || "Hatırlatma yok"}</span></div></div><div className="flex shrink-0 gap-2"><button type="button" disabled={saving} onClick={() => void toggle(routine).catch(() => undefined)} className="secondary-button">{routine.isActive ? <Pause size={14} /> : <Play size={14} />}{routine.isActive ? "Duraklat" : "Devam Ettir"}</button><button type="button" disabled={saving} onClick={() => setEditing(routine)} className="icon-button" aria-label={`${routine.title} rutinini düzenle`}><Pencil size={15} /></button><button type="button" disabled={saving} onClick={() => setDeleting(routine)} className="icon-button text-rose-600" aria-label={`${routine.title} rutinini sil`}><Trash2 size={15} /></button></div></article>;
    })}</div>}
    {editing !== undefined ? <CalendarRoutineFormDialog routine={editing ?? undefined} users={users} saving={saving} onCancel={() => { if (!saving) { setEditing(undefined); onRequestedEditHandled(); } }} onSave={save} /> : null}
    {deleting ? <div className="responsive-dialog z-[85]" role="alertdialog" aria-modal="true" aria-labelledby="delete-routine-title"><button type="button" className="absolute inset-0" onClick={() => { if (!saving) setDeleting(null); }} aria-label="Silme onayını kapat" /><section className="responsive-dialog-panel max-w-md"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="delete-routine-title" className="text-sm font-semibold text-slate-950">Rutini Sil</h2><button type="button" disabled={saving} onClick={() => setDeleting(null)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body p-5"><p className="text-sm text-slate-700">“{deleting.title}” kalıcı olarak silinsin mi?</p><p className="mt-2 text-xs leading-5 text-slate-500">Geçmiş etkinlikler korunur; gelecekteki oluşumlar ve bekleyen hatırlatmalar kaldırılır.</p></div><footer className="responsive-dialog-footer"><button type="button" disabled={saving} onClick={() => setDeleting(null)} className="secondary-button">Vazgeç</button><button type="button" disabled={saving} onClick={() => void remove().catch(() => undefined)} className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? "Siliniyor…" : "Rutini Sil"}</button></footer></section></div> : null}
  </section>;
}
