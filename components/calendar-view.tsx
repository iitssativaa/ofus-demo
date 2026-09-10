"use client";

import { PageHeader } from "./page-header";
import { EventCalendar } from "./event-calendar";
import type { CalendarEvent, CalendarRoutine } from "@/lib/calendar-event-types";

export function CalendarView({ initialEvents, initialRoutines }: { initialEvents: CalendarEvent[]; initialRoutines: CalendarRoutine[] }) {
  return <>
    <PageHeader eyebrow="Planlama" title="Takvim" description="Görev teslimlerini ve etkinliklerini ayın tamamında görün." />
    <EventCalendar initialEvents={initialEvents} initialRoutines={initialRoutines} />
  </>;
}


