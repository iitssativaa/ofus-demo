"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, CalendarPlus, Clock3, Repeat2, X } from "lucide-react";
import type { CalendarEvent, CalendarEventInput, CalendarRoutine } from "@/lib/calendar-event-types";
import { localDate, localTime } from "@/lib/task-selectors";
import { createCalendarEvent, deleteCalendarEvent, listCalendarEventsClient, updateCalendarEvent } from "@/lib/supabase/calendar-events-client";
import { useWorkspace } from "./app-provider";
import { CalendarEventDetailDialog } from "./calendar-event-detail-dialog";
import { CalendarEventFormDialog } from "./calendar-event-form-dialog";
import { CalendarMonthNavigator } from "./calendar-month-navigator";
import { CalendarRoutineManager } from "./calendar-routine-manager";

const toIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const subscribeTimeZone = () => () => undefined;
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function EventCalendar({ initialEvents, initialRoutines }: { initialEvents: CalendarEvent[]; initialRoutines: CalendarRoutine[] }) {
  const { users } = useWorkspace();
  const timeZone = useSyncExternalStore(subscribeTimeZone, browserTimeZone, serverTimeZone);
  const [events, setEvents] = useState(initialEvents);
  const [routines, setRoutines] = useState(initialRoutines);
  const [view, setView] = useState<"events" | "routines">("events");
  const [requestedRoutineEditId, setRequestedRoutineEditId] = useState<string>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [mobileDayOpen, setMobileDayOpen] = useState(false);
  const [formEvent, setFormEvent] = useState<CalendarEvent | null | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const deleteLock = useRef(false);
  const today = new Date();
  const visibleMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= days ? day : null;
  });
  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(visibleMonth);
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const date = localDate(event.startsAt, timeZone);
      grouped.set(date, [...(grouped.get(date) ?? []), event]);
    }
    return grouped;
  }, [events, timeZone]);
  const selectedEvents = [...(eventsByDay.get(selectedDate) ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const selectedLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone }).format(new Date(`${selectedDate}T12:00:00`));
  const navigateToMonth = (targetYear: number, targetMonth: number) => {
    setMonthOffset((targetYear - today.getFullYear()) * 12 + targetMonth - today.getMonth());
    setSelectedDate(toIso(targetYear, targetMonth, 1));
  };
  const selectNavigatorDate = (targetYear: number, targetMonth: number, targetDay: number) => {
    setMonthOffset((targetYear - today.getFullYear()) * 12 + targetMonth - today.getMonth());
    setSelectedDate(toIso(targetYear, targetMonth, targetDay));
  };
  const goToday = () => { setMonthOffset(0); setSelectedDate(localDate()); };
  const openCreate = () => { setError(""); setFormEvent(null); };
  const save = async (input: CalendarEventInput) => {
    setSaving(true);
    setError("");
    try {
      if (formEvent) {
        const updated = await updateCalendarEvent(formEvent.id, input);
        setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
        setSelectedEvent(updated);
      } else {
        const created = await createCalendarEvent(input);
        setEvents((current) => [...current, created]);
        setSelectedDate(localDate(created.startsAt, timeZone));
      }
      setFormEvent(undefined);
    } catch (saveError) {
      console.error("Etkinlik kaydedilemedi.", saveError);
      const message = "Etkinlik kaydedilemedi. Lütfen tekrar deneyin.";
      setError(message);
      throw new Error(message);
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!selectedEvent || !confirmDelete) return setConfirmDelete(true);
    if (deleteLock.current) return;
    deleteLock.current = true;
    setSaving(true);
    setError("");
    try {
      await deleteCalendarEvent(selectedEvent.id);
      setEvents((current) => current.filter((event) => event.id !== selectedEvent.id));
      setSelectedEvent(null);
      setConfirmDelete(false);
    } catch {
      setError("Etkinlik silinemedi. Lütfen tekrar deneyin.");
    } finally { deleteLock.current = false; setSaving(false); }
  };
  useEffect(() => {
    if (!mobileDayOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileDayOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileDayOpen]);

  const selectedContent = selectedEvents.length ? <div className="divide-y divide-slate-100">{selectedEvents.map((event) => <button key={event.id} type="button" onClick={() => { setMobileDayOpen(false); setSelectedEvent(event); setConfirmDelete(false); }} className="w-full p-4 text-left hover:bg-slate-50"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.category === "work" ? "bg-indigo-500" : "bg-amber-500"}`} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">{event.isRoutineOccurrence ? <Repeat2 size={13} className="shrink-0 text-indigo-500" aria-label="Rutin etkinlik" /> : null}<span className="truncate">{event.title}</span></p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={12} />{localTime(event.startsAt, timeZone)}{event.endsAt ? ` – ${localTime(event.endsAt, timeZone)}` : ""} · {event.category === "work" ? "İş" : "Sosyal"}</p><p className="mt-2 text-[11px] text-slate-500">{event.participantIds.length} katılımcı</p></div></div></button>)}</div> : <div className="px-6 py-10 text-center xl:py-14"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400"><CalendarDays size={18} /></div><p className="mt-4 text-sm font-semibold text-slate-700">Bu tarihte etkinlik bulunmuyor.</p><button type="button" onClick={() => { setMobileDayOpen(false); setFormEvent(null); }} className="mt-3 text-link"><CalendarPlus size={14} />Etkinlik Ekle</button></div>;

  return <>
    {error ? <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p> : null}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="segment-control inline-flex rounded-xl border p-1" role="tablist" aria-label="Etkinlik takvimi görünümü"><button type="button" role="tab" aria-selected={view === "events"} onClick={() => setView("events")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${view === "events" ? "segment-button-active" : "text-slate-500"}`}>Etkinlikler</button><button type="button" role="tab" aria-selected={view === "routines"} onClick={() => setView("routines")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${view === "routines" ? "segment-button-active" : "text-slate-500"}`}>Rutinler</button></div>{view === "events" ? <button type="button" onClick={openCreate} className="primary-button"><CalendarPlus size={15} />Etkinlik Ekle</button> : null}</div>
    {view === "routines" ? <CalendarRoutineManager routines={routines} onRoutinesChange={setRoutines} users={users} requestedEdit={routines.find((routine) => routine.id === requestedRoutineEditId)} onRequestedEditHandled={() => setRequestedRoutineEditId(undefined)} onOccurrencesChanged={async () => setEvents(await listCalendarEventsClient())} /> : <div className="grid gap-6 xl:grid-cols-[minmax(680px,1fr)_380px]">
      <section className="panel overflow-hidden">
        <div className="flex min-h-16 items-center border-b border-slate-100 px-2 py-3 sm:px-5"><CalendarMonthNavigator year={year} month={month} selectedDate={selectedDate} onNavigate={navigateToMonth} onSelectDate={selectNavigatorDate} onToday={goToday} /></div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map((day, index) => {
          if (!day) return <div key={index} className="min-h-14 border-b border-r border-slate-100 bg-slate-50/40 sm:min-h-20 xl:min-h-24" />;
          const iso = toIso(year, month, day);
          const dayEvents = eventsByDay.get(iso) ?? [];
          const selected = iso === selectedDate;
          const isToday = iso === localDate();
          const hasWork = dayEvents.some((event) => event.category === "work");
          const hasSocial = dayEvents.some((event) => event.category === "social");
          return <button key={index} type="button" onClick={() => { setSelectedDate(iso); if (window.matchMedia("(max-width: 1279px)").matches) setMobileDayOpen(true); }} aria-label={`${day} ${monthLabel}${dayEvents.length ? `, ${dayEvents.length} etkinlik` : ""}`} aria-pressed={selected} className={`calendar-day relative flex min-h-14 w-full flex-col items-center border-b border-r border-slate-100 px-0.5 py-2 text-center sm:min-h-20 sm:px-1 sm:py-3 xl:min-h-24 ${selected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-500" : "bg-white"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${isToday ? "calendar-day-today" : selected ? "calendar-day-selected" : "text-slate-600"}`}>{day}</span><span className="mt-1 flex h-2 items-center gap-1 sm:mt-1.5">{hasWork ? <span className="h-2 w-2 rounded-full bg-indigo-500" /> : null}{hasSocial ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}</span>{dayEvents.length > 1 ? <span className="mt-1 hidden text-[9px] font-semibold text-slate-400 sm:block">{dayEvents.length} etkinlik</span> : null}</button>;
        })}</div>
      </section>
      <aside className="panel hidden h-fit overflow-hidden xl:sticky xl:top-24 xl:block"><div className="panel-header"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Seçili gün</p><h2 className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedLabel}</h2><p className="section-subtitle">{selectedEvents.length} etkinlik</p></div><button type="button" onClick={openCreate} className="icon-button" aria-label="Bu güne etkinlik ekle"><CalendarPlus size={18} /></button></div>{selectedContent}</aside>
    </div>}
    {mobileDayOpen ? <div className="fixed inset-0 z-[70] flex items-end xl:hidden" role="dialog" aria-modal="true" aria-labelledby="event-selected-day-title"><button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileDayOpen(false)} aria-label="Seçili günü kapat" /><section className="relative max-h-[82dvh] w-full overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Seçili gün</p><h2 id="event-selected-day-title" className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedLabel}</h2><p className="section-subtitle">{selectedEvents.length} etkinlik</p></div><div className="flex"><button type="button" onClick={() => { setMobileDayOpen(false); setFormEvent(null); }} className="icon-button h-10 w-10" aria-label="Bu güne etkinlik ekle"><CalendarPlus size={18} /></button><button type="button" onClick={() => setMobileDayOpen(false)} className="icon-button h-10 w-10" aria-label="Kapat"><X size={18} /></button></div></header><div className="max-h-[65dvh] overflow-y-auto">{selectedContent}</div></section></div> : null}
    {formEvent !== undefined ? <CalendarEventFormDialog event={formEvent ?? undefined} initialDate={selectedDate} users={users} timeZone={timeZone} saving={saving} onCancel={() => { if (!saving) setFormEvent(undefined); }} onSave={save} /> : null}
    {selectedEvent ? <CalendarEventDetailDialog event={selectedEvent} users={users} timeZone={timeZone} deleting={saving} confirmDelete={confirmDelete} error={error} onClose={() => { if (!saving) { setSelectedEvent(null); setConfirmDelete(false); } }} onEdit={() => { if (!saving) { if (selectedEvent.isRoutineOccurrence && selectedEvent.routineId) { setRequestedRoutineEditId(selectedEvent.routineId); setView("routines"); } else { setFormEvent(selectedEvent); } setSelectedEvent(null); } }} onDelete={remove} onCancelDelete={() => { if (!saving) setConfirmDelete(false); }} /> : null}
  </>;
}
