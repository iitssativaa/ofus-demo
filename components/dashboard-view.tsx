"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, ListTodo, Plus, UsersRound } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar-event-types";
import type { MushroomBoardData } from "@/lib/supabase/mushroom-board";
import { dashboardSummary, localDate, localTime, memberWorkload, taskIsOverdue } from "@/lib/task-selectors";
import type { Task, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { DeadlineCountdown, FutureCountdown } from "./deadline-countdown";
import { PageHeader } from "./page-header";
import { MushroomBoard } from "./mushroom-board";
import { UserAvatar } from "./user-avatar";

function SummaryCard({ label, children, hint, icon: Icon, tone, urgent = false }: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  icon: typeof CircleAlert;
  tone: string;
  urgent?: boolean;
}) {
  return <div className={`panel metric-card flex min-h-28 items-start justify-between gap-3 p-4 ${urgent ? "metric-card-alert" : ""}`}>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-2 min-w-0 text-slate-950">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
    <span className={`shrink-0 rounded-lg p-2 ${tone}`}><Icon size={17} /></span>
  </div>;
}

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

  return <button type="button" onClick={() => setSelectedTask(task)} className="task-row-interactive flex min-h-16 w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 sm:items-center sm:px-5">
    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${overdue ? "bg-rose-500" : today ? "bg-amber-500" : "bg-indigo-500"}`} />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-850">{task.title}</p>
        {focus && overdue ? <span className="text-[10px] font-bold text-rose-600">Gecikti</span> : null}
        {focus && !overdue && today ? <span className="text-[10px] font-bold text-amber-700">Bugün</span> : null}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">{company?.name ?? "Firma yok"} / {project?.name ?? "Proje yok"}</p>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-1.5">
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

  return <Link href="/calendar" className="task-row-interactive flex min-h-16 items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 sm:px-5">
    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.category === "work" ? "bg-indigo-500" : "bg-amber-500"}`} />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2"><CategoryBadge category={event.category} /><p className="truncate text-sm font-semibold text-slate-850">{event.title}</p></div>
      <p className="mt-1 truncate text-[11px] text-slate-400">{participantNames || "Katılımcı yok"}</p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-xs font-semibold text-slate-600">{dayLabel} · {localTime(event.startsAt, timeZone)}</p>
      <FutureCountdown dateTime={event.startsAt} className="mt-1 block max-w-36 text-[10px] leading-4" />
    </div>
  </Link>;
}

export function DashboardView({ calendarEvents, mushroomBoard }: { calendarEvents: CalendarEvent[]; mushroomBoard: MushroomBoardData }) {
  const { tasks, users, taskError, setQuickAddOpen } = useWorkspace();
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { active, overdue, dueToday, upcoming, focus } = dashboardSummary(tasks, now);
  const today = localDate(now, timeZone);
  const todaysEvents = calendarEvents.filter((event) => localDate(event.startsAt, timeZone) === today);
  const futureEvents = [...calendarEvents]
    .filter((event) => new Date(event.startsAt).getTime() > now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nextEvent = futureEvents[0];
  const upcomingEvents = futureEvents.slice(0, 5);
  const maxPoints = Math.max(1, ...users.map((user) => memberWorkload(active, user.id).points));

  return <>
    <div className="demo-strip mb-4" role="status" aria-label="Demo ortamı">DEMO</div>
    <PageHeader eyebrow="Günlük operasyon" title="Şu an neye odaklanmalıyız?" description="Geciken işleri, bugünün gündemini ve sıradaki adımları tek bakışta görün." actions={<><Link href="/tasks" className="secondary-button">Tüm görevler</Link><button onClick={() => setQuickAddOpen(true)} className="primary-button"><Plus size={15} />Görev Ekle</button></>} />
    {taskError ? <p role="alert" className="mb-4 text-sm text-rose-700">{taskError}</p> : null}
    <MushroomBoard initialNotes={mushroomBoard.notes} currentUserId={mushroomBoard.currentUserId} />

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Günlük özet">
      <SummaryCard label="Geciken" hint="Karar bekleyen işler" icon={CircleAlert} tone="bg-rose-50 text-rose-600" urgent={overdue.length > 0}><p className="text-2xl font-semibold tracking-tight">{overdue.length}</p></SummaryCard>
      <SummaryCard label="Bugün" icon={CalendarClock} tone="bg-amber-50 text-amber-700"><p className="text-base font-semibold leading-6 sm:text-lg">{dueToday.length} görev <span className="text-slate-400">·</span> {todaysEvents.length} etkinlik</p></SummaryCard>
      <SummaryCard label="Yaklaşan Etkinlik" icon={UsersRound} tone="bg-indigo-50 text-indigo-700">
        {nextEvent ? <Link href="/calendar" className="block min-w-0 rounded-md outline-none focus:ring-2 focus:ring-indigo-300"><span className="flex items-center gap-2"><CategoryBadge category={nextEvent.category} /><span className="truncate text-sm font-semibold">{nextEvent.title}</span></span><span className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] text-slate-500"><span>{localTime(nextEvent.startsAt, timeZone)}</span><span>·</span><FutureCountdown dateTime={nextEvent.startsAt} /></span></Link> : <p className="text-sm font-medium text-slate-500">Yaklaşan etkinlik yok</p>}
      </SummaryCard>
      <SummaryCard label="Aktif Görevler" hint="Tamamlanmamış güncel işler" icon={ListTodo} tone="bg-violet-50 text-violet-700"><p className="text-2xl font-semibold tracking-tight">{active.length}</p></SummaryCard>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
      <section className="panel overflow-hidden">
        <div className="panel-header"><div><h2 className="section-title">Bugünün Odağı</h2><p className="section-subtitle">Önce gecikenler, ardından bugünün ve en yakın tarihli işler</p></div><Link href="/tasks" className="text-link shrink-0">Tümünü gör <ArrowRight size={14} /></Link></div>
        <div>{focus.length ? focus.map((task) => <DashboardTaskRow key={task.id} task={task} focus />) : <p className="px-5 py-6 text-sm text-slate-400">Şu anda odaklanmanız gereken aktif görev yok.</p>}</div>
      </section>
      <section className="panel p-5">
        <div><h2 className="section-title">İş Yükü</h2><p className="section-subtitle">Aktif görevlerin boyut puanlarına göre dağılımı</p></div>
        <div className="mt-5 space-y-5">{users.length ? users.map((user) => {
          const { count, points } = memberWorkload(active, user.id);
          return <div key={user.id}>
            <div className="flex items-center justify-between gap-3"><UserAvatar userId={user.id} showName /><p className="shrink-0 text-xs text-slate-400"><span className="font-bold text-slate-900">{points} puan</span> · {count} görev</p></div>
            <div className="workload-bar mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="workload-fill h-full rounded-full" style={{ width: `${points / maxPoints * 100}%`, backgroundColor: user.color, color: user.color }} /></div>
          </div>;
        }) : <p className="py-2 text-sm text-slate-400">Çalışma alanında üye bulunmuyor.</p>}</div>
        <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">S = 1 · M = 2 · L = 4 · XL = 8 puan</p>
      </section>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="panel overflow-hidden">
        <div className="panel-header"><div><h2 className="section-title">Yaklaşan Görevler</h2><p className="section-subtitle">Önümüzdeki 7 gün içindeki aktif son tarihler</p></div><Link href="/tasks" className="text-link shrink-0">Tümünü gör <ArrowRight size={14} /></Link></div>
        <div>{upcoming.length ? upcoming.map((task) => <DashboardTaskRow key={task.id} task={task} />) : <p className="px-5 py-6 text-sm text-slate-400">Yaklaşan görev yok.</p>}</div>
      </section>
      <section className="panel overflow-hidden">
        <div className="panel-header"><div><h2 className="section-title">Yaklaşan Etkinlikler</h2><p className="section-subtitle">Sıradaki iş ve sosyal etkinlikler</p></div><Link href="/calendar" className="text-link shrink-0">Takvime git <ArrowRight size={14} /></Link></div>
        <div>{upcomingEvents.length ? upcomingEvents.map((event) => <DashboardEventRow key={event.id} event={event} timeZone={timeZone} users={users} />) : <p className="px-5 py-6 text-sm text-slate-400">Yaklaşan etkinlik yok.</p>}</div>
      </section>
    </div>
  </>;
}
