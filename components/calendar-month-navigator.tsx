"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const dateIso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function CalendarMonthNavigator({ year, month, selectedDate, onNavigate, onSelectDate, onToday }: {
  year: number;
  month: number;
  selectedDate: string;
  onNavigate: (year: number, month: number) => void;
  onSelectDate: (year: number, month: number, day: number) => void;
  onToday: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [navigatorDate, setNavigatorDate] = useState(() => new Date(year, month, 1));
  const navigatorYear = navigatorDate.getFullYear();
  const navigatorMonth = navigatorDate.getMonth();
  const today = new Date();
  const todayValue = dateIso(today.getFullYear(), today.getMonth(), today.getDate());

  const openNavigator = () => {
    setNavigatorDate(new Date(year, month, 1));
    setView("days");
    setOpen(true);
  };
  const moveMainMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    onNavigate(next.getFullYear(), next.getMonth());
  };
  const moveNavigator = (delta: number) => setNavigatorDate((current) => view === "days"
    ? new Date(current.getFullYear(), current.getMonth() + delta, 1)
    : new Date(current.getFullYear() + delta, current.getMonth(), 1));
  const firstGridDate = new Date(navigatorYear, navigatorMonth, 1 - ((new Date(navigatorYear, navigatorMonth, 1).getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstGridDate.getFullYear(), firstGridDate.getMonth(), firstGridDate.getDate() + index));

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return <div className="relative flex min-w-0 flex-1 items-center justify-center gap-1">
    <button type="button" onClick={() => moveMainMonth(-1)} className="icon-button h-9 w-9 shrink-0" aria-label="Önceki ay"><ChevronLeft size={16} /></button>
    <button type="button" onClick={openNavigator} aria-haspopup="dialog" aria-expanded={open} className="group inline-flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold capitalize text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:min-w-32">
      {monthNames[month]} {year}<ChevronDown size={14} className="text-slate-400 transition group-hover:text-indigo-500" />
    </button>
    <button type="button" onClick={() => moveMainMonth(1)} className="icon-button h-9 w-9 shrink-0" aria-label="Sonraki ay"><ChevronRight size={16} /></button>
    <button type="button" onClick={onToday} className="secondary-button h-9 shrink-0 px-2.5">Bugün</button>

    {open ? <>
      <button type="button" className="fixed inset-0 z-[80] cursor-default bg-slate-950/35 sm:bg-transparent" onClick={() => setOpen(false)} aria-label="Tarih gezginini kapat" />
      <section role="dialog" aria-modal="true" aria-label="Tarih gezgini" className="calendar-navigator-popover fixed inset-x-3 bottom-3 z-[90] mx-auto w-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:mx-0 sm:w-80 sm:rounded-xl">
        <header className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => moveNavigator(-1)} className="icon-button h-9 w-9" aria-label={view === "days" ? "Gezginde önceki ay" : "Gezginde önceki yıl"}><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setView((current) => current === "days" ? "months" : "days")} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold capitalize text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200" aria-label={view === "days" ? "Ay seçimine geç" : "Gün seçimine dön"}>{view === "days" ? `${monthNames[navigatorMonth]} ${navigatorYear}` : navigatorYear}<ChevronDown size={13} className={`text-slate-400 transition ${view === "months" ? "rotate-180" : ""}`} /></button>
          <div className="flex"><button type="button" onClick={() => moveNavigator(1)} className="icon-button h-9 w-9" aria-label={view === "days" ? "Gezginde sonraki ay" : "Gezginde sonraki yıl"}><ChevronRight size={16} /></button><button type="button" onClick={() => setOpen(false)} className="icon-button h-9 w-9 sm:hidden" aria-label="Kapat"><X size={17} /></button></div>
        </header>

        <div key={`${view}-${navigatorYear}-${navigatorMonth}`} className="calendar-navigator-content mt-2">
          {view === "days" ? <>
            <div className="grid grid-cols-7">{weekDays.map((day) => <span key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-0.5">{days.map((date) => {
              const value = dateIso(date.getFullYear(), date.getMonth(), date.getDate());
              const outside = date.getMonth() !== navigatorMonth;
              const selected = value === selectedDate;
              const current = value === todayValue;
              return <button key={value} type="button" onClick={() => { onSelectDate(date.getFullYear(), date.getMonth(), date.getDate()); setOpen(false); }} aria-label={new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date)} aria-pressed={selected} className={`flex aspect-square min-h-10 items-center justify-center rounded-lg text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${selected ? "bg-indigo-600 text-white hover:bg-indigo-700" : current ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100" : outside ? "text-slate-300 hover:bg-slate-50 hover:text-slate-500" : "text-slate-700 hover:bg-slate-100"}`}>{date.getDate()}</button>;
            })}</div>
          </> : <div className="grid grid-cols-3 gap-2 py-2">{monthNames.map((name, monthIndex) => <button key={name} type="button" onClick={() => { setNavigatorDate(new Date(navigatorYear, monthIndex, 1)); setView("days"); }} className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${monthIndex === navigatorMonth ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{name}</button>)}</div>}
        </div>
        <footer className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><CalendarDays size={13} />Tarih seçin</span><button type="button" onClick={() => { onToday(); setOpen(false); }} className="text-link">Bugüne git</button></footer>
      </section>
    </> : null}
  </div>;
}
