"use client";

import { useSyncExternalStore } from "react";
import type { CalendarEvent, CalendarRoutine } from "@/lib/calendar-event-types";
import { DashboardView } from "./dashboard-view";
import { CalendarView } from "./calendar-view";
import { InboxView } from "./inbox-view";
import type { TaskWorkspaceData } from "@/lib/supabase/tasks";
import type { MushroomBoardData } from "@/lib/supabase/mushroom-board";
import { QuickAddTask } from "./quick-add-task";
import { TaskCompletionDialog } from "./task-completion-dialog";
import { TaskDataProvider } from "./task-data-provider";
import { TaskDeletionDialog } from "./task-deletion-dialog";
import { TaskDetail } from "./task-detail";
import { TasksView } from "./tasks-view";

const subscribe = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export function TaskWorkspace({ data, calendarEvents = [], calendarRoutines = [], loadError = "", view = "tasks", initialSelectedTaskId = null, taskReturnHref }: { data: TaskWorkspaceData; calendarEvents?: CalendarEvent[]; calendarRoutines?: CalendarRoutine[]; mushroomBoard?: MushroomBoardData; loadError?: string; view?: "tasks" | "dashboard" | "calendar" | "inbox"; initialSelectedTaskId?: string | null; taskReturnHref?: string }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  if (!ready) return <div className="panel p-8 text-sm text-slate-500" role="status" data-page-motion-pending>Veriler yükleniyor…</div>;
  if (loadError && view !== "tasks") return <div className="panel p-6 text-sm text-rose-700" role="alert">{loadError} Lütfen sayfayı yenileyip tekrar deneyin.</div>;
  return <TaskDataProvider key={`${view}-${initialSelectedTaskId ?? "list"}`} data={data} initialSelectedTaskId={initialSelectedTaskId}>
    {view === "dashboard" ? <DashboardView calendarEvents={calendarEvents} /> : view === "calendar" ? <CalendarView initialEvents={calendarEvents} initialRoutines={calendarRoutines} /> : view === "inbox" ? <InboxView workspaceActivities={data.workspaceActivities} /> : <TasksView loadError={loadError} />}
    <QuickAddTask />
    <TaskDetail returnHref={taskReturnHref} routeNavigation={Boolean(initialSelectedTaskId)} />
    <TaskCompletionDialog />
    <TaskDeletionDialog />
  </TaskDataProvider>;
}
