"use client";

import { useState } from "react";
import { Ban, Bell, CalendarClock, CheckCircle2, CircleDot, ListPlus, Pencil, StickyNote, UserPlus } from "lucide-react";
import { recentTaskActivities } from "@/lib/task-selectors";
import { formatDate } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { UserAvatar } from "./user-avatar";
import type { WorkspaceActivity } from "@/lib/types";

const icons: Record<string, typeof Bell> = {
  task_created: ListPlus,
  assignee_changed: UserPlus,
  due_date_changed: CalendarClock,
  status_changed: Pencil,
  task_completed: CheckCircle2,
  task_cancelled: Ban,
  mushroom_note_created: StickyNote,
};
const timeLabel = (value: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function InboxView({ workspaceActivities }: { workspaceActivities: WorkspaceActivity[] }) {
  const { tasks, companies, projects, users, taskError, setSelectedTask } = useWorkspace();
  const recentTasks = [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const activities = [
    ...recentTaskActivities(tasks).map((item) => ({ kind: "task" as const, ...item })),
    ...workspaceActivities.map((activity) => ({ kind: "workspace" as const, activity })),
  ].sort((a, b) => b.activity.createdAt.localeCompare(a.activity.createdAt) || b.activity.id.localeCompare(a.activity.id));
  const relationLabel = (companyId: string, projectId: string) => [companies.find((item) => item.id === companyId)?.name, projects.find((item) => item.id === projectId)?.name].filter(Boolean).join(" · ");
  const [tab, setTab] = useState<"new" | "activity">("new");

  return <>
    <PageHeader eyebrow="İş hareketleri" title="Gelen Kutusu" description="Yeni iş girişlerini ve çalışma alanındaki son iş hareketlerini izleyin." />
    {taskError ? <p role="alert" className="mb-4 text-sm text-rose-700">{taskError}</p> : null}
    <div className="segment-control mb-4 grid w-full max-w-md grid-cols-2 rounded-xl border p-1" role="tablist" aria-label="Gelen Kutusu görünümü"><button type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")} className={`segment-button min-h-10 rounded-lg px-2 text-xs font-semibold ${tab === "new" ? "segment-button-active" : "text-slate-500"}`}>Yeni İş Girişleri</button><button type="button" role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")} className={`segment-button min-h-10 rounded-lg px-2 text-xs font-semibold ${tab === "activity" ? "segment-button-active" : "text-slate-500"}`}>İş Hareketleri</button></div>
    <div className="inbox-panels">
      <section className={`panel overflow-hidden ${tab === "new" ? "block" : "hidden"}`} role="tabpanel"><div className="panel-header"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><ListPlus size={17} /></span><div><h2 className="section-title">Yeni İş Girişleri</h2><p className="section-subtitle">Yakın zamanda oluşturulan görevler</p></div></div></div>
        <div className="divide-y divide-slate-100">{recentTasks.length ? recentTasks.map((task) => <button key={task.id} onClick={() => setSelectedTask(task)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><CircleDot size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{task.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{relationLabel(task.companyId, task.projectId)}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-600">{formatDate(task.createdAt, true)}</p><p className="mt-1 text-[10px] text-slate-400">Oluşturuldu</p></div><UserAvatar userId={task.assigneeId} size="sm" /></button>) : <p className="p-8 text-center text-sm text-slate-400">Henüz görev yok.</p>}</div>
      </section>
      <section className={`panel h-fit overflow-hidden ${tab === "activity" ? "block" : "hidden"}`} role="tabpanel"><div className="panel-header"><div className="flex items-center gap-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Bell size={17} /></span><div><h2 className="section-title">İş Hareketleri</h2><p className="section-subtitle">Son {activities.length} iş hareketi · en yeni önce</p></div></div></div>
        {activities.length ? <div className="divide-y divide-slate-100">{activities.map((item) => {
          const { activity } = item;
          const Icon = icons[activity.eventType ?? ""] ?? Pencil;
          const actor = users.find((user) => user.id === activity.userId);
          if (item.kind === "workspace") return <article key={activity.id} className="relative bg-white p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5 text-slate-800"><span className="font-bold">{actor?.name ?? "Bilinmeyen kullanıcı"}</span> {activity.description}</p><p className="mt-1 text-[11px] text-slate-400">Mantar Pano</p><div className="mt-2 flex items-center gap-2"><UserAvatar userId={activity.userId} size="sm" /><time dateTime={activity.createdAt} className="text-[10px] text-slate-400">{timeLabel(activity.createdAt)}</time></div></div></div></article>;
          const { task } = item;
          return <article key={activity.id} className="relative bg-white p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Icon size={16} /></span><div className="min-w-0 flex-1"><button onClick={() => setSelectedTask(task)} className="text-left text-sm font-semibold leading-5 text-slate-800 hover:text-indigo-700"><span className="block">{activity.description}</span><span className="mt-1 block text-xs font-medium">{task.title}</span></button><p className="mt-1 text-[11px] text-slate-400">{relationLabel(task.companyId, task.projectId)}</p><div className="mt-2 flex items-center gap-2"><UserAvatar userId={activity.userId} size="sm" /><span className="text-[10px] text-slate-400">{actor?.name ?? "Bilinmeyen kullanıcı"} · <time dateTime={activity.createdAt}>{timeLabel(activity.createdAt)}</time></span></div></div></div></article>;
        })}</div> : <div className="px-6 py-14 text-center"><CheckCircle2 size={22} className="mx-auto text-emerald-500" /><p className="mt-3 text-sm font-semibold text-slate-700">Henüz iş hareketi yok.</p><p className="mt-1 text-xs text-slate-400">Yeni iş hareketleri burada görünür.</p></div>}
      </section>
    </div>
  </>;
}
