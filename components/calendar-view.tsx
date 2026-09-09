"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import { companyFor, isOverdue, todayIso } from "@/lib/utils";
import { calendarDeadlines, priorityRank } from "@/lib/task-selectors";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { MonthBoard } from "./calendar/month-board";
import { PriorityBadge, StatusBadge } from "./badges";
import { UserAvatar } from "./user-avatar";
import { EventCalendar } from "./event-calendar";
import type { CalendarEvent, CalendarRoutine } from "@/lib/calendar-event-types";
import { CalendarMonthNavigator } from "./calendar-month-navigator";
import { useDialogFocus } from "./use-dialog-focus";

const toIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function TaskDeadlineCalendar() {
  const { tasks, companies, projects, taskError, setSelectedTask } = useWorkspace();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [mobileDayOpen, setMobileDayOpen] = useState(false);
  useDialogFocus(mobileDayOpen, () => setMobileDayOpen(false));
  const today = new Date();
  const visibleMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const deadlines = useMemo(() => calendarDeadlines(tasks), [tasks]);
  const selectedTasks = useMemo(() => [...(deadlines.get(selectedDate) ?? [])].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]), [deadlines, selectedDate]);
  const selectedLabel = useMemo(() => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);
  const selectDay = useCallback((iso: string) => { setSelectedDate(iso); setMobileDayOpen(true); }, []);
  const renderDay = useCallback((iso: string) => (deadlines.get(iso) ?? []).map((task) => <button type="button" key={task.id} className="ofus-calendar-item" data-tone={isOverdue(task) ? "overdue" : "deadline"} title={task.title} onClick={() => setSelectedTask(task)}><span>{task.title}</span><time>{task.dueTime}</time></button>), [deadlines, setSelectedTask]);
  const navigateToMonth = (targetYear: number, targetMonth: number) => {
    setMonthOffset((targetYear - today.getFullYear()) * 12 + targetMonth - today.getMonth());
    setSelectedDate(toIso(targetYear, targetMonth, 1));
  };
  const selectNavigatorDate = (targetYear: number, targetMonth: number, targetDay: number) => {
    setMonthOffset((targetYear - today.getFullYear()) * 12 + targetMonth - today.getMonth());
    setSelectedDate(toIso(targetYear, targetMonth, targetDay));
  };
  const goToday = () => { setMonthOffset(0); setSelectedDate(todayIso()); };
  useEffect(() => {
    if (!mobileDayOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileDayOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileDayOpen]);
  const selectedContent = selectedTasks.length ? <div className="divide-y divide-slate-100">{selectedTasks.map((task) => <button key={task.id} onClick={() => { setMobileDayOpen(false); setSelectedTask(task); }} className="w-full p-4 text-left hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{task.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{companyFor(task.companyId, companies).name} · {projects.find((item) => item.id === task.projectId)?.name}</p></div><UserAvatar userId={task.assigneeId} size="sm" /></div><div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />{task.dueTime ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500"><Clock3 size={12} />{task.dueTime}</span> : null}{isOverdue(task) ? <span className="text-[10px] font-bold text-rose-600">Gecikti</span> : null}</div></button>)}</div> : <div className="px-6 py-10 text-center xl:py-14"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400"><CalendarDays size={18} /></div><p className="mt-4 text-sm font-semibold text-slate-700">Bu tarihte görev bulunmuyor.</p><p className="mt-1 text-xs text-slate-400">Başka bir gün seçebilirsiniz.</p></div>;

  return <>
    {taskError ? <p role="alert" className="mb-4 text-sm text-rose-700">{taskError}</p> : null}
    <div className="calendar-layout grid gap-5">
      <section className="panel overflow-hidden">
        <div className="flex min-h-16 items-center border-b border-slate-100 px-2 py-3 sm:px-5"><CalendarMonthNavigator year={year} month={month} selectedDate={selectedDate} onNavigate={navigateToMonth} onSelectDate={selectNavigatorDate} onToday={goToday} /></div>
        <MonthBoard year={year} month={month} today={todayIso()} selectedDate={selectedDate} onSelect={selectDay} renderDay={renderDay} />      </section>

      
    </div>
    {mobileDayOpen ? <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="selected-day-title"><button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileDayOpen(false)} aria-label="Seçili günü kapat" /><section className="relative max-h-[82dvh] w-full sm:max-w-lg overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Seçili gün</p><h2 id="selected-day-title" className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedLabel}</h2><p className="section-subtitle">{selectedTasks.length} teslim</p></div><button type="button" onClick={() => setMobileDayOpen(false)} className="icon-button h-10 w-10" aria-label="Kapat"><X size={18} /></button></header><div className="max-h-[65dvh] overflow-y-auto">{selectedContent}</div></section></div> : null}
  </>;
}

export function CalendarView({ initialEvents, initialRoutines }: { initialEvents: CalendarEvent[]; initialRoutines: CalendarRoutine[] }) {
  const [mode, setMode] = useState<"all" | "deadlines" | "events">("all");
  return <>
    <PageHeader eyebrow="Planlama" title="Takvim" description="Görev teslimlerini ve etkinliklerini ayın tamamında görün." />
    <div className="segment-control mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1" role="tablist" aria-label="Takvim görünümü">
      <button type="button" role="tab" aria-selected={mode === "all"} onClick={() => setMode("all")} className={`segment-button min-h-9 rounded-lg px-3 text-xs font-semibold ${mode === "all" ? "segment-button-active" : "text-slate-500"}`}>Tümü</button><button type="button" role="tab" aria-selected={mode === "deadlines"} onClick={() => setMode("deadlines")} className={`segment-button min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${mode === "deadlines" ? "segment-button-active" : "text-slate-500"}`}>Görev Takvimi</button>
      <button type="button" role="tab" aria-selected={mode === "events"} onClick={() => setMode("events")} className={`segment-button min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${mode === "events" ? "segment-button-active" : "text-slate-500"}`}>Etkinlik Takvimi</button>
    </div>
    <div role="tabpanel">{mode === "deadlines" ? <TaskDeadlineCalendar /> : <EventCalendar initialEvents={initialEvents} initialRoutines={initialRoutines} includeDeadlines={mode === "all"} />}</div>
  </>;
}


