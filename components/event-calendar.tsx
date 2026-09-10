"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarPlus } from "lucide-react";
import type { CalendarEvent, CalendarEventInput, CalendarRoutine } from "@/lib/calendar-event-types";
import { localDate, localTime, calendarDeadlines, taskIsOverdue } from "@/lib/task-selectors";
import { createCalendarEvent, deleteCalendarEvent, listCalendarEventsClient, updateCalendarEvent } from "@/lib/supabase/calendar-events-client";
import { useWorkspace } from "./app-provider";
import { CalendarEventDetailDialog } from "./calendar-event-detail-dialog";
import { CalendarEventFormDialog, calendarEventCreateDraftKey } from "./calendar-event-form-dialog";
import { CalendarMonthNavigator } from "./calendar-month-navigator";
import { CalendarRoutineManager } from "./calendar-routine-manager";
import { toast } from "./toast";
import { MonthBoard } from "./calendar/month-board";
import { useFormDrafts } from "./form-draft-provider";

const toIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const subscribeTimeZone = () => () => undefined;
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function EventCalendar({ initialEvents, initialRoutines }: { initialEvents: CalendarEvent[]; initialRoutines: CalendarRoutine[] }) {
  const { users, tasks, setSelectedTask } = useWorkspace();
  const drafts = useFormDrafts();
  const deadlines = useMemo(() => calendarDeadlines(tasks), [tasks]);
  const [search, setSearch] = useState("");
  const timeZone = useSyncExternalStore(subscribeTimeZone, browserTimeZone, serverTimeZone);
  const [events, setEvents] = useState(initialEvents);
  const [routines, setRoutines] = useState(initialRoutines);
  const [view, setView] = useState<"events" | "routines">("events");
  const [contentFilter, setContentFilter] = useState<"all" | "deadlines" | "events">("all");
  const [requestedRoutineEditId, setRequestedRoutineEditId] = useState<string>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(localDate());
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
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    const ranges = events.map((event) => {
      const start = localDate(event.startsAt, timeZone);
      const end = event.endsAt ? localDate(new Date(new Date(event.endsAt).getTime() - 1), timeZone) : start;
      return { event, start, end };
    });
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    for (let index = 0; index < count; index++) {
      const visibleDate = new Date(year, month, index - offset + 1);
      const iso = toIso(visibleDate.getFullYear(), visibleDate.getMonth(), visibleDate.getDate());
      const items = ranges.filter(({ start, end }) => start <= iso && end >= iso).map(({ event }) => event).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      if (items.length) grouped.set(iso, items);
    }    return grouped;
  }, [events, timeZone, year, month]);
  const normalizedSearch = search.toLocaleLowerCase("tr");
  const selectDay = useCallback((iso: string) => { const draft = drafts.get<CalendarEventInput>(calendarEventCreateDraftKey); if (draft) drafts.set(calendarEventCreateDraftKey, { ...draft, date: iso, endDate: iso }); setSelectedDate(iso); setFormEvent(null); }, [drafts]);
  const renderDay = useCallback((iso: string) => <>
    {contentFilter !== "events" ? (deadlines.get(iso) ?? []).filter((task) => task.title.toLocaleLowerCase("tr").includes(normalizedSearch)).map((task) => <button type="button" key={task.id} className="ofus-calendar-item" data-tone={taskIsOverdue(task) ? "overdue" : "deadline"} title={task.title} onClick={() => setSelectedTask(task)}><span>{task.title}</span><time>{task.dueTime}</time></button>) : null}
    {contentFilter !== "deadlines" ? (eventsByDay.get(iso) ?? []).filter((event) => event.title.toLocaleLowerCase("tr").includes(normalizedSearch)).map((event) => <button type="button" key={event.id} className="ofus-calendar-item" data-tone={event.category} title={`${event.title} · ${localTime(event.startsAt, timeZone)}`} onClick={() => { setSelectedDate(iso); setSelectedEvent(event); setConfirmDelete(false); }}><span>{event.isRoutineOccurrence ? "↻ " : ""}{event.title}</span><time>{localTime(event.startsAt, timeZone)}</time></button>) : null}
  </>, [contentFilter, deadlines, eventsByDay, normalizedSearch, setSelectedTask, timeZone]);
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
        toast.show("eventUpdated");
      } else {
        const created = await createCalendarEvent(input);
        setEvents((current) => [...current, created]);
        setSelectedDate(localDate(created.startsAt, timeZone));
        toast.show("eventCreated");
      }
      setFormEvent(undefined);
    } catch (saveError) {
      console.error("Etkinlik kaydedilemedi.", saveError);
      const message = "Etkinlik kaydedilemedi. Lütfen tekrar deneyin.";
      setError(message);
      toast.show("saveError", { message });
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
      toast.show("eventCancelled", { message: "Etkinlik silindi" });
    } catch {
      setError("Etkinlik silinemedi. Lütfen tekrar deneyin.");
      toast.show("saveError", { message: "Etkinlik silinemedi" });
    } finally { deleteLock.current = false; setSaving(false); }
  };
  return <>
    {error ? <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p> : null}
    <div className="mb-4 flex flex-wrap items-center justify-end gap-3"><div className="segment-control inline-flex rounded-xl border p-1" role="tablist" aria-label="Takvim yönetimi"><button type="button" role="tab" aria-selected={view === "events"} onClick={() => setView("events")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${view === "events" ? "segment-button-active" : "text-slate-500"}`}>Takvim</button><button type="button" role="tab" aria-selected={view === "routines"} onClick={() => setView("routines")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${view === "routines" ? "segment-button-active" : "text-slate-500"}`}>Rutinler</button></div>{view === "events" ? <button type="button" onClick={openCreate} className="primary-button"><CalendarPlus size={15} />Etkinlik Ekle</button> : null}</div>
    {view === "routines" ? <CalendarRoutineManager routines={routines} onRoutinesChange={setRoutines} users={users} requestedEdit={routines.find((routine) => routine.id === requestedRoutineEditId)} onRequestedEditHandled={() => setRequestedRoutineEditId(undefined)} onOccurrencesChanged={async () => setEvents(await listCalendarEventsClient())} /> : <div className="calendar-layout grid gap-5">
      <section className="panel overflow-hidden">
        <div className="ofus-calendar-toolbar"><div className="ofus-calendar-month"><CalendarMonthNavigator year={year} month={month} selectedDate={selectedDate} onNavigate={navigateToMonth} onSelectDate={selectNavigatorDate} onToday={goToday} /></div>
        <div className="ofus-calendar-filters"><div className="segment-control inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1" role="tablist" aria-label="Takvim içeriği"><button type="button" role="tab" aria-selected={contentFilter === "all"} onClick={() => setContentFilter("all")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${contentFilter === "all" ? "segment-button-active" : "text-slate-500"}`}>Tümü</button><button type="button" role="tab" aria-selected={contentFilter === "deadlines"} onClick={() => setContentFilter("deadlines")} className={`segment-button min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${contentFilter === "deadlines" ? "segment-button-active" : "text-slate-500"}`}>Görev teslimleri</button><button type="button" role="tab" aria-selected={contentFilter === "events"} onClick={() => setContentFilter("events")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${contentFilter === "events" ? "segment-button-active" : "text-slate-500"}`}>Etkinlikler</button></div><label className="min-w-[180px] flex-1 sm:max-w-xs"><span className="sr-only">Takvimde ara</span><input className="input mt-0 w-full" placeholder="Takvimde ara…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div></div>
        <MonthBoard year={year} month={month} today={localDate()} selectedDate={selectedDate} onSelect={selectDay} renderDay={renderDay} />      </section>
      
    </div>}
    {formEvent !== undefined ? <CalendarEventFormDialog event={formEvent ?? undefined} initialDate={selectedDate} users={users} timeZone={timeZone} saving={saving} onCancel={() => { if (!saving) setFormEvent(undefined); }} onSave={save} /> : null}
    {selectedEvent ? <CalendarEventDetailDialog event={selectedEvent} users={users} timeZone={timeZone} deleting={saving} confirmDelete={confirmDelete} error={error} onClose={() => { if (!saving) { setSelectedEvent(null); setConfirmDelete(false); } }} onEdit={() => { if (!saving) { if (selectedEvent.isRoutineOccurrence && selectedEvent.routineId) { setRequestedRoutineEditId(selectedEvent.routineId); setView("routines"); } else { setFormEvent(selectedEvent); } setSelectedEvent(null); } }} onDelete={remove} onCancelDelete={() => { if (!saving) setConfirmDelete(false); }} /> : null}
  </>;
}



