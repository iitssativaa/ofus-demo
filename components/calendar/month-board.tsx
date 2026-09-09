"use client";
import { memo, useMemo, type ReactNode } from "react";

const fullDateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" });
const shortMonthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const shortDayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export const MonthBoard = memo(function MonthBoard({ year, month, today, selectedDate, onSelect, renderDay }: { year: number; month: number; today: string; selectedDate: string; onSelect: (iso: string) => void; renderDay: (iso: string) => ReactNode }) {
  const days = useMemo(() => {
    const first = (new Date(year, month, 1).getDay() + 6) % 7;
    const length = Math.ceil((first + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length }, (_, index) => {
      const date = new Date(year, month, index - first + 1);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const outside = date.getMonth() !== month;
      return { iso, outside, day: date.getDate(), label: fullDateFormatter.format(date), monthLabel: outside ? shortMonthFormatter.format(date) : "" };
    });
  }, [year, month]);
  return <><div className="ofus-month-grid border-b border-slate-100">{dayNames.map((day, index) => <div key={day} className="overflow-hidden px-2 py-3 text-xs font-medium text-slate-500"><span className="hidden sm:inline">{day}</span><span className="sm:hidden">{shortDayNames[index]}</span></div>)}</div><div className="ofus-month-grid">{days.map(({ iso, outside, day, label, monthLabel }) => <div key={iso} className="ofus-day" data-outside={outside} data-selected={iso === selectedDate}><button type="button" className="ofus-day-heading" aria-label={label} aria-current={iso === today ? "date" : undefined} aria-pressed={iso === selectedDate} onClick={() => onSelect(iso)}><span>{day}</span>{outside ? <small>{monthLabel}</small> : null}</button><div className="ofus-day-items">{renderDay(iso)}</div></div>)}</div></>;
});
