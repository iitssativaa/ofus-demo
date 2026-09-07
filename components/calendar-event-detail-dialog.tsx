"use client";

import { Bell, CalendarDays, Clock3, Pencil, Repeat2, Trash2, Users, X } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar-event-types";
import { localTime } from "@/lib/task-selectors";
import type { User } from "@/lib/types";
import { reminderPresets } from "@/lib/reminders";

export function CalendarEventDetailDialog({ event, users, timeZone, deleting, confirmDelete, error, onClose, onEdit, onDelete, onCancelDelete }: {
  event: CalendarEvent;
  users: User[];
  timeZone: string;
  deleting: boolean;
  confirmDelete: boolean;
  error?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  const dateLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(event.startsAt));
  const participantNames = event.participantIds.map((id) => users.find((user) => user.id === id)?.name).filter(Boolean).join(", ");
  const reminderLabels = event.reminders.map((preset) => reminderPresets.find((item) => item.value === preset)?.label).filter(Boolean).join(", ");
  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="calendar-event-detail-title">
    <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Etkinlik detayını kapat" />
    <section className="responsive-dialog-panel max-w-lg">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${event.category === "work" ? "bg-indigo-500" : "bg-amber-500"}`} /><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{event.category === "work" ? "İş" : "Sosyal"}</span>{event.isRoutineOccurrence ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500"><Repeat2 size={11} />Rutin etkinlik</span> : null}</div><h2 id="calendar-event-detail-title" className="mt-2 text-base font-semibold text-slate-950">{event.title}</h2></div><button type="button" onClick={onClose} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body space-y-4 p-5 text-sm text-slate-600">
        {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2"><p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 text-indigo-500" /><span className="capitalize">{dateLabel}</span></p><p className="flex items-start gap-2"><Clock3 size={16} className="mt-0.5 text-indigo-500" /><span>{localTime(event.startsAt, timeZone)}{event.endsAt ? ` – ${localTime(event.endsAt, timeZone)}` : ""}</span></p><p className="flex items-start gap-2 sm:col-span-2"><Users size={16} className="mt-0.5 text-indigo-500" /><span>{participantNames || "Katılımcı bulunmuyor"}</span></p>{reminderLabels ? <p className="flex items-start gap-2 sm:col-span-2"><Bell size={16} className="mt-0.5 text-indigo-500" /><span>{reminderLabels}</span></p> : null}</div>
        {event.description ? <div><p className="field-label">Not</p><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{event.description}</p></div> : null}
        {confirmDelete ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-semibold text-rose-800">Bu etkinliği silmek istediğinizden emin misiniz?</p><p className="mt-1 text-xs leading-5 text-rose-700">Bekleyen hatırlatmalar iptal edilir. Gönderilmiş bildirim geçmişi korunur.</p><div className="mt-3 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onCancelDelete}>Vazgeç</button><button type="button" disabled={deleting} className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60" onClick={onDelete}>{deleting ? "Siliniyor…" : "Etkinliği Sil"}</button></div></div> : null}
      </div>
      {!confirmDelete ? <footer className="responsive-dialog-footer">{!event.isRoutineOccurrence ? <button type="button" className="secondary-button text-rose-600" onClick={onDelete}><Trash2 size={14} />Etkinliği Sil</button> : null}{event.isRoutineOccurrence && !event.routineId ? <button type="button" className="secondary-button" onClick={onClose}>Kapat</button> : <button type="button" className="primary-button" onClick={onEdit}>{event.isRoutineOccurrence ? <Repeat2 size={14} /> : <Pencil size={14} />}{event.isRoutineOccurrence ? "Rutini Düzenle" : "Düzenle"}</button>}</footer> : null}
    </section>
  </div>;
}
