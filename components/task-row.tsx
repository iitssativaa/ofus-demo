"use client";

import { Check, Clock3 } from "lucide-react";
import type { Task } from "@/lib/types";
import { companyFor, formatDate, isOverdue } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PriorityBadge, StatusBadge } from "./badges";
import { UserAvatar } from "./user-avatar";
import { DeadlineCountdown } from "./deadline-countdown";
import { Checkbox } from "./checkbox";

type SelectionProps = { selectable?: boolean; selected?: boolean; onSelectionChange?: (selected: boolean) => void };

export function TaskRow({ task, compact = false, showCountdown = false, selectable = false, selected = false, onSelectionChange }: { task: Task; compact?: boolean; showCountdown?: boolean } & SelectionProps) {
  const { companies, projects, setSelectedTask, setCompletionTask } = useWorkspace();
  const overdue = isOverdue(task);
  const project = projects.find((item) => item.id === task.projectId);
  return (
    <div data-selected={selected || undefined} className={`task-row-interactive group grid items-center gap-3 border-b border-slate-100 px-3 last:border-0 ${compact ? selectable ? "grid-cols-[32px_26px_minmax(0,1fr)] py-3 sm:grid-cols-[32px_26px_minmax(0,1fr)_auto]" : "grid-cols-[26px_minmax(0,1fr)] py-3 sm:grid-cols-[26px_minmax(0,1fr)_auto]" : selectable ? "grid-cols-[32px_26px_minmax(180px,1.6fr)_minmax(140px,1fr)_46px_92px_150px_42px] py-3" : "grid-cols-[26px_minmax(180px,1.6fr)_minmax(140px,1fr)_46px_92px_150px_42px] py-3"}`}>
      {selectable ? <Checkbox checked={selected} onChange={(value) => onSelectionChange?.(value)} ariaLabel={`${task.title} görevini seç`} /> : null}
      <button onClick={() => task.status === "Done" ? setSelectedTask(task) : setCompletionTask(task)} className={`flex h-5 w-5 items-center justify-center rounded-full border ${task.status === "Done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-indigo-400"}`} aria-label={task.status === "Done" ? "Tamamlanan görevi aç" : "Görevi tamamlama formunu aç"}>{task.status === "Done" ? <Check size={12} /> : null}</button>
      <button onClick={() => setSelectedTask(task)} className="min-w-0 text-left"><div className={`truncate text-sm font-semibold ${task.status === "Done" ? "text-slate-400 line-through" : "text-slate-850"}`}>{task.title}</div><div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-400"><span style={{ color: companyFor(task.companyId, companies).color }}>●</span>{companyFor(task.companyId, companies).name}<span>/</span>{project?.name ?? "—"}</div></button>
      {compact ? <div className="col-start-2 flex flex-wrap items-center gap-3 sm:col-start-auto"><UserAvatar userId={task.assigneeId} size="sm" /><span className={`flex items-center gap-1 text-xs font-semibold ${overdue ? "text-rose-600" : "text-slate-500"}`}><Clock3 size={13} />{formatDate(task.dueDate)}</span></div> : <><div className="min-w-0"><StatusBadge status={task.status} /></div><UserAvatar userId={task.assigneeId} size="sm" /><PriorityBadge priority={task.priority} /><span className={`text-xs font-semibold ${overdue ? "text-rose-600" : "text-slate-500"}`}><span className="block">{formatDate(task.dueDate)}</span>{showCountdown ? <DeadlineCountdown dueAt={task.dueAt} className="mt-0.5 block whitespace-nowrap text-[10px]" /> : null}</span><span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">{task.size}</span></>}
    </div>
  );
}

export function TaskCard({ task, showCountdown = false, selectable = false, selected = false, onSelectionChange }: { task: Task; showCountdown?: boolean } & SelectionProps) {
  const { companies, projects, setSelectedTask } = useWorkspace();
  const project = projects.find((item) => item.id === task.projectId);
  return <div data-selected={selected || undefined} className="task-card-interactive relative w-full rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]">
    {selectable ? <div className="absolute left-2.5 top-2.5 z-10"><Checkbox checked={selected} onChange={(value) => onSelectionChange?.(value)} ariaLabel={`${task.title} görevini seç`} /></div> : null}
    <button onClick={() => setSelectedTask(task)} className={`w-full p-3.5 text-left ${selectable ? "pl-11" : ""}`}><div className="flex items-start justify-between gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div><p className="mt-3 break-words text-sm font-semibold leading-5 text-slate-850">{task.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{companyFor(task.companyId, companies).name} · {project?.name ?? "—"}</p><div className="mt-4 flex flex-wrap items-end justify-between gap-2"><UserAvatar userId={task.assigneeId} size="sm" /><span className="ml-auto min-w-0 text-right"><span className={`flex items-center justify-end gap-1 text-[11px] font-semibold ${isOverdue(task) ? "text-rose-600" : "text-slate-500"}`}><Clock3 size={12} />{formatDate(task.dueDate)}{task.dueTime ? ` · ${task.dueTime}` : ""}</span>{showCountdown ? <DeadlineCountdown dueAt={task.dueAt} className="mt-1 block whitespace-nowrap text-[10px]" /> : null}</span></div></button>
  </div>;
}
