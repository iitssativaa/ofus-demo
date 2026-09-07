"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import { companyFor, isOverdue, todayIso } from "@/lib/utils";
import { calendarDeadlines, priorityRank } from "@/lib/task-selectors";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { PriorityBadge, StatusBadge } from "./badges";
import { UserAvatar } from "./user-avatar";
import { EventCalendar } from "./event-calendar";
import type { CalendarEvent, CalendarRoutine } from "@/lib/calendar-event-types";
import { CalendarMonthNavigator } from "./calendar-month-navigator";

const toIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function TaskDeadlineCalendar() {
  const { tasks, companies, projects, taskError, setSelectedTask } = useWorkspace();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [mobileDayOpen, setMobileDayOpen] = useState(false);
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
  const deadlines = calendarDeadlines(tasks);
  const selectedTasks = [...(deadlines.get(selectedDate) ?? [])].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const selectedLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00`));
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
    <div className="grid gap-6 xl:grid-cols-[minmax(680px,1fr)_380px]">
      <section className="panel overflow-hidden">
        <div className="flex min-h-16 items-center border-b border-slate-100 px-2 py-3 sm:px-5"><CalendarMonthNavigator year={year} month={month} selectedDate={selectedDate} onNavigate={navigateToMonth} onSelectDate={selectNavigatorDate} onToday={goToday} /></div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map((day, index) => {
          if (!day) return <div key={index} className="min-h-14 border-b border-r border-slate-100 bg-slate-50/40 sm:min-h-20 xl:min-h-24" />;
          const iso = toIso(year, month, day);
          const deadlineCount = deadlines.get(iso)?.length ?? 0;
          const selected = iso === selectedDate;
          const isToday = iso === todayIso();
          return <button key={index} onClick={() => { setSelectedDate(iso); if (window.matchMedia("(max-width: 1279px)").matches) setMobileDayOpen(true); }} aria-label={`${day} ${monthLabel}${deadlineCount ? `, ${deadlineCount} görev son tarihi` : ""}`} aria-pressed={selected} className={`calendar-day relative flex min-h-14 w-full flex-col items-center border-b border-r border-slate-100 px-0.5 py-2 text-center sm:min-h-20 sm:px-1 sm:py-3 xl:min-h-24 ${selected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-500" : "bg-white"}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${isToday ? "calendar-day-today" : selected ? "calendar-day-selected" : "text-slate-600"}`}>{day}</span>
            {deadlineCount ? <span className="deadline-dot mt-1 h-2 w-2 rounded-full bg-rose-500 sm:mt-1.5" aria-hidden="true" /> : <span className="mt-1 h-2 sm:mt-1.5" />}
            {deadlineCount > 1 ? <span className="mt-1 hidden text-[9px] font-semibold text-slate-400 sm:block">{deadlineCount} teslim</span> : null}
          </button>;
        })}</div>
      </section>

      <aside className="panel hidden h-fit overflow-hidden xl:sticky xl:top-24 xl:block"><div className="panel-header"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Seçili gün</p><h2 className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedLabel}</h2><p className="section-subtitle">{selectedTasks.length} teslim</p></div><CalendarDays size={18} className="text-slate-400" /></div>
        {selectedContent}
      </aside>
    </div>
    {mobileDayOpen ? <div className="fixed inset-0 z-[70] flex items-end xl:hidden" role="dialog" aria-modal="true" aria-labelledby="selected-day-title"><button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileDayOpen(false)} aria-label="Seçili günü kapat" /><section className="relative max-h-[82dvh] w-full overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Seçili gün</p><h2 id="selected-day-title" className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedLabel}</h2><p className="section-subtitle">{selectedTasks.length} teslim</p></div><button type="button" onClick={() => setMobileDayOpen(false)} className="icon-button h-10 w-10" aria-label="Kapat"><X size={18} /></button></header><div className="max-h-[65dvh] overflow-y-auto">{selectedContent}</div></section></div> : null}
  </>;
}

export function CalendarView({ initialEvents, initialRoutines }: { initialEvents: CalendarEvent[]; initialRoutines: CalendarRoutine[] }) {
  const [mode, setMode] = useState<"deadlines" | "events">("deadlines");
  return <>
    <PageHeader eyebrow="Planlama" title="Takvim" description="Görev son tarihleri ile iş ve sosyal etkinlikleri ayrı görünümlerde yönetin." />
    <div className="segment-control mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1" role="tablist" aria-label="Takvim görünümü">
      <button type="button" role="tab" aria-selected={mode === "deadlines"} onClick={() => setMode("deadlines")} className={`segment-button min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${mode === "deadlines" ? "segment-button-active" : "text-slate-500"}`}>Task-Deadline Takvimi</button>
      <button type="button" role="tab" aria-selected={mode === "events"} onClick={() => setMode("events")} className={`segment-button min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${mode === "events" ? "segment-button-active" : "text-slate-500"}`}>Etkinlik Takvimi</button>
    </div>
    <div role="tabpanel">{mode === "deadlines" ? <TaskDeadlineCalendar /> : <EventCalendar initialEvents={initialEvents} initialRoutines={initialRoutines} />}</div>
  </>;
}
