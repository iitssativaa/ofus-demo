"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar-event-types";
import type { MushroomBoardData } from "@/lib/supabase/mushroom-board";
import { dashboardSummary, localDate, localTime, memberWorkload, taskIsOverdue } from "@/lib/task-selectors";
import type { Task, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { DeadlineCountdown, FutureCountdown } from "./deadline-countdown";
import { RingMetric, MonthlyChart, TeamGauge } from "./dashboard/metrics";
import { sizePoints } from "@/lib/types";
import { MushroomBoard } from "./mushroom-board";
import { UserAvatar } from "./user-avatar";

function CategoryBadge({ category }: { category: CalendarEvent["category"] }) {
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${category === "work" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
    {category === "work" ? "İş" : "Sosyal"}
  </span>;
}

function DashboardTaskRow({ task, focus = false }: { task: Task; focus?: boolean }) {
  const { companies, projects, setSelectedTask } = useWorkspace();
  const company = companies.find((item) => item.id === task.companyId);
  const project = projects.find((item) => item.id === task.projectId);
  const overdue = taskIsOverdue(task);
  const today = task.dueDate === localDate();

  return <button type="button" onClick={() => setSelectedTask(task)} className="dashboard-row task-row-interactive grid min-h-[4.75rem] w-full grid-cols-[10px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3.5 text-left last:border-0 sm:grid-cols-[10px_minmax(0,1fr)_auto] sm:items-center sm:gap-y-0 sm:px-5">
    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${overdue ? "bg-rose-500" : today ? "bg-amber-500" : "bg-indigo-500"}`} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-850">{task.title}</p>
        {focus && overdue ? <span className="text-[10px] font-bold text-rose-600">Gecikti</span> : null}
        {focus && !overdue && today ? <span className="text-[10px] font-bold text-amber-700">Bugün</span> : null}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">{company?.name ?? "Firma yok"} / {project?.name ?? "Proje yok"}</p>
    </div>
    <div className="col-start-2 flex min-w-0 flex-row items-center justify-between gap-2 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:gap-1.5">
      <div className="flex items-center gap-2">
        <UserAvatar userId={task.assigneeId} size="sm" />
        <span className={`text-xs font-semibold ${overdue ? "text-rose-600" : "text-slate-500"}`}>{formatDate(task.dueDate)}</span>
      </div>
      <DeadlineCountdown dueAt={task.dueAt} className="max-w-44 whitespace-normal text-right text-[10px] leading-4" />
    </div>
  </button>;
}

function DashboardEventRow({ event, timeZone, users }: { event: CalendarEvent; timeZone: string; users: User[] }) {
  const eventDate = localDate(event.startsAt, timeZone);
  const today = localDate(new Date(), timeZone);
  const tomorrowDate = new Date(`${today}T12:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDate(tomorrowDate, timeZone);
  const dayLabel = eventDate === today
    ? "Bugün"
    : eventDate === tomorrow
      ? "Yarın"
      : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone }).format(new Date(event.startsAt));
  const participantNames = event.participantIds
    .map((id) => users.find((user) => user.id === id)?.firstName ?? users.find((user) => user.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return <Link href="/calendar" className="dashboard-row task-row-interactive grid min-h-[4.75rem] grid-cols-[10px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3.5 last:border-0 sm:grid-cols-[10px_minmax(0,1fr)_auto] sm:items-center sm:gap-y-0 sm:px-5">
    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${event.category === "work" ? "bg-indigo-500" : "bg-amber-500"}`} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2"><CategoryBadge category={event.category} /><p className="truncate text-sm font-semibold text-slate-850">{event.title}</p></div>
      <p className="mt-1 truncate text-[11px] text-slate-400">{participantNames || "Katılımcı yok"}</p>
    </div>
    <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 text-right sm:col-start-3 sm:row-start-1 sm:block">
      <p className="text-xs font-semibold text-slate-600">{dayLabel} · {localTime(event.startsAt, timeZone)}</p>
      <FutureCountdown dateTime={event.startsAt} className="mt-1 block max-w-36 text-[10px] leading-4" />
    </div>
  </Link>;
}

export function DashboardView({ calendarEvents, mushroomBoard }: { calendarEvents: CalendarEvent[]; mushroomBoard: MushroomBoardData }) {
  const { tasks, users, projects, companies, taskError } = useWorkspace();
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { active, overdue, dueToday, upcoming, focus } = dashboardSummary(tasks, now);
  const completed = tasks.filter((task) => task.status === "Done" && !task.cancelledAt);
  const completedPoints = completed.reduce((sum, task) => sum + sizePoints[task.size], 0);
  const counts = Array.from({ length: 12 }, (_, month) => completed.filter((task) => task.completedAt && new Date(task.completedAt).getFullYear() === now.getFullYear() && new Date(task.completedAt).getMonth() === month).length);
  const datedCompletions = completed.filter((task) => task.completedAt && task.dueAt);
  const onTime = datedCompletions.filter((task) => new Date(task.completedAt!).getTime() <= new Date(task.dueAt!).getTime()).length;
  const onTimeRate = datedCompletions.length ? Math.round(onTime / datedCompletions.length * 100) : null;
  const activeProjects = projects.filter((project) => project.status !== "On hold");
  const upcomingEvents = [...calendarEvents].filter((event) => new Date(event.startsAt).getTime() > now.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5);
  const workloads = users.map((user) => ({ user, ...memberWorkload(active, user.id) }));
  const totalPoints = workloads.reduce((sum, member) => sum + member.points, 0);
  return <>
    <h1 className="sr-only">Genel Bakış</h1>
    {taskError ? <p role="alert" className="mb-4 text-sm text-rose-700">{taskError}</p> : null}
    <div className="ofus-dashboard">
      <section className="panel"><h2 className="section-title">Genel Durum</h2><p><strong className="ofus-stat-number">{completedPoints}</strong> <span className="text-sm text-slate-400">puan</span></p><p className="mt-2 text-sm text-slate-400">Tamamlanan görevlerin toplam puanı</p><div className="mt-10 space-y-5">{users.map((user) => <div key={user.id} className="flex items-center justify-between gap-3"><UserAvatar userId={user.id} showName /><span className="text-sm font-medium">{completed.filter((task) => task.assigneeId === user.id).reduce((sum, task) => sum + sizePoints[task.size], 0)} puan</span></div>)}</div></section>
      <section className="panel ofus-summary"><div className="flex justify-between"><h2 className="section-title">Görev Özeti</h2><span className="text-sm text-slate-500">{now.getFullYear()}</span></div><div className="flex gap-10"><div><p className="text-sm text-slate-500">Toplam Görev</p><p className="ofus-stat-number mt-2">{tasks.filter((task) => !task.cancelledAt).length}</p></div><div className="text-emerald-500"><p className="text-sm">Tamamlanan</p><p className="ofus-stat-number mt-2">{completed.length}</p></div></div><MonthlyChart counts={counts} month={now.getMonth()} /></section>
      <section className="panel"><h2 className="section-title">Aktif Görevler</h2><Link href="/tasks"><RingMetric value={active.length} total={active.length + completed.length} label="Görev" /></Link><div className="ofus-legend"><span>Bugün: {dueToday.length}</span><span>Geciken: {overdue.length}</span></div></section>
      <div className="ofus-cork"><MushroomBoard initialNotes={mushroomBoard.notes} currentUserId={mushroomBoard.currentUserId} /></div>
      <section className="panel"><h2 className="section-title">Ekip Durumu</h2><TeamGauge percent={onTimeRate} /></section>
      <section className="panel"><h2 className="section-title">Aktif Projeler</h2><Link href="/projects"><RingMetric value={activeProjects.length} total={projects.length} label="Proje" color="var(--brand)" /></Link><div className="ofus-legend"><span>Aktif: {activeProjects.length}</span><span>Beklemede: {projects.length - activeProjects.length}</span></div></section>
      <section className="panel"><h2 className="section-title">İş Yükü</h2><p className="text-sm text-slate-500">Toplam görev puanı</p><p className="ofus-stat-number mt-2">{totalPoints}</p><div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">{workloads.map(({ user, points }) => <span key={user.id} style={{ width: `${totalPoints ? points / totalPoints * 100 : 0}%`, background: user.color }} />)}</div><div className="mt-7 space-y-5">{workloads.map(({ user, points, count }) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-2"><UserAvatar userId={user.id} showName /><span className="text-xs text-slate-400">{points} puan · {count} görev</span></div>)}</div><p className="mt-7 border-t border-slate-100 pt-4 text-xs text-slate-400">S = 1 · M = 2 · L = 4 · XL = 8</p></section>
      <section className="panel"><h2 className="section-title">Yaklaşan Görevler</h2>{upcoming.length ? upcoming.map((task) => <DashboardTaskRow key={task.id} task={task} />) : <p className="py-8 text-sm text-slate-400">Yaklaşan görev yok.</p>}<Link href="/tasks" className="text-link mt-6">Tüm görevleri gör <ArrowRight size={14} /></Link></section>
      <section className="panel ofus-focus"><div className="flex justify-between gap-3"><h2 className="section-title">Bugünün Odağı</h2><Link href="/tasks" className="text-link self-start">Tümünü gör <ArrowRight size={14} /></Link></div>{focus.length ? focus.map((task) => <DashboardTaskRow key={task.id} task={task} focus />) : <p className="py-8 text-sm text-slate-400">Şu anda odaklanmanız gereken aktif görev yok.</p>}</section>
      <section className="panel"><h2 className="section-title">Projeler</h2>{activeProjects.slice(0, 3).map((project) => { const projectTasks = tasks.filter((task) => task.projectId === project.id && !task.cancelledAt); const done = projectTasks.filter((task) => task.status === "Done").length; const progress = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0; return <Link key={project.id} href={`/projects/${project.id}`} className="block border-b border-slate-100 py-4 last:border-0"><p className="font-medium">{project.name}</p><p className="mt-1 text-xs text-slate-400">{companies.find((company) => company.id === project.companyId)?.name}</p><div className="ofus-progress"><span style={{ width: `${progress}%` }} /></div><p className="text-xs text-slate-500">{done} / {projectTasks.length} görev tamamlandı</p></Link>; })}{!activeProjects.length ? <p className="py-8 text-sm text-slate-400">Aktif proje yok.</p> : null}</section>
      <section className="panel"><h2 className="section-title">Yaklaşan Etkinlikler</h2>{upcomingEvents.length ? upcomingEvents.map((event) => <DashboardEventRow key={event.id} event={event} timeZone={timeZone} users={users} />) : <p className="py-8 text-sm text-slate-400">Yaklaşan etkinlik yok.</p>}<Link href="/calendar" className="text-link mt-6">Takvime git <ArrowRight size={14} /></Link></section>
    </div>
  </>;
}
