"use client";

import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clipboard, Clock3, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { priorityLabels, statusLabels } from "@/lib/i18n";
import type { Priority, Status, TaskSize } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PriorityBadge, StatusBadge } from "./badges";
import { UserAvatar } from "./user-avatar";
import { ReminderPresetPicker } from "./reminder-preset-picker";
import { ThemedSelect } from "./themed-select";
import { ResourceLinksSection } from "./resource-links-section";
import { useDialogFocus } from "./use-dialog-focus";
import { toast, type ToastKey } from "./toast";

const activeStatuses: Status[] = ["To Do", "In Progress", "Waiting", "Review"];
const completionItems = [
  ["delivered", "Teslim edildi"],
  ["feedbackReceived", "Müşteriden dönüt alındı"],
  ["revisionsCompleted", "Gerekli revizeler tamamlandı"],
  ["successfullyClosed", "Başarılı şekilde kapatıldı"],
] as const;

const formatActivityDate = (value: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-700">{children}</dd></div>;
}

export function TaskDetail({ returnHref, routeNavigation = false }: { returnHref?: string; routeNavigation?: boolean } = {}) {
  const router = useRouter();
  const [newSubtask, setNewSubtask] = useState("");
  const { tasks, companies, projects, users, taskError, taskSaving, selectedTask: task, setSelectedTask, setCompletionTask, setDeletionTask, updateTask, addTaskActivity } = useWorkspace();
  const close = () => { setSelectedTask(null); if (returnHref) router.push(returnHref); };
  useDialogFocus(Boolean(task), close);
  if (!task) return null;
  const update = async (values: Parameters<typeof updateTask>[1], notification: ToastKey | null = "recordUpdated") => {
    try { await updateTask(task.id, values); if (notification) toast.show(notification); return true; }
    catch { return false; }
  };
  const updateWithActivity = async (values: Parameters<typeof updateTask>[1], description: string, eventType: string, notificationOverride?: ToastKey) => {
    if (!await update(values, null)) return false;
    try { await addTaskActivity(task.id, description, undefined, eventType); }
    catch { /* Alan değişikliği kaydedildi; hareket hatası arayüzde gösterilir. */ }
    const type: ToastKey = notificationOverride ?? (eventType === "assignee_changed" ? "taskAssigned" : eventType === "due_date_changed" ? "dueDateChanged" : eventType === "status_changed" ? "taskStatusChanged" : eventType === "note_updated" ? "noteAdded" : "recordUpdated");
    toast.show(type);
    return true;
  };
  const project = projects.find((item) => item.id === task.projectId);
  const company = companies.find((item) => item.id === task.companyId);
  const assignee = users.find((item) => item.id === task.assigneeId);
  const done = task.checklist.filter((item) => item.done).length;
  const cancelled = Boolean(task.cancelledAt && task.deletionReason);
  const completed = !cancelled && task.status === "Done";
  const archived = completed || cancelled;
  const activities = [...(task.activity ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const taskIndex = tasks.findIndex((item) => item.id === task.id);
  const previousTask = taskIndex > 0 ? tasks[taskIndex - 1] : null;
  const nextTask = taskIndex >= 0 && taskIndex < tasks.length - 1 ? tasks[taskIndex + 1] : null;
  const goToTask = (next: typeof task) => { setNewSubtask(""); if (routeNavigation) router.replace(`/tasks/${next.id}`); else setSelectedTask(next); };
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`); toast.show("linkCopied"); } catch { toast.show("copyError"); } };
  const addSubtask = async () => { const label = newSubtask.trim(); if (!label || taskSaving) return; const saved = await updateWithActivity({ checklist: [...task.checklist, { id: crypto.randomUUID(), label, done: false }] }, `Alt görev eklendi: ${label}`, "checklist_updated", "subtaskAdded"); if (saved !== false) setNewSubtask(""); };

  return <div className="fixed inset-0 z-[55] flex justify-end bg-slate-950/25 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label={`Görev: ${task.title}`}>
    <button className="absolute inset-0" onClick={close} aria-label="Görev ayrıntılarını kapat" />
    <aside className="drawer-shell ofus-detail-panel relative flex h-full w-full max-w-[900px] flex-col overflow-hidden bg-white shadow-2xl">
      <header className="ofus-detail-toolbar"><div className="ofus-detail-toolbar-group"><button className="icon-button" onClick={close} aria-label="Görevlerden çık"><ChevronLeft size={18} /></button><span className="ofus-detail-id">Görev · {task.id.slice(0, 8)}</span>{cancelled ? <span className="badge bg-rose-50 text-rose-700">İptal edildi</span> : <><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></>}</div><div className="ofus-detail-toolbar-group"><button className="secondary-button" type="button" onClick={copyLink}><Clipboard size={15} /><span className="hidden sm:inline">Bağlantıyı kopyala</span></button><button className="icon-button" onClick={close} aria-label="Kapat"><X size={18} /></button></div></header>
      <div className="flex-1 overflow-y-auto p-5 sm:p-7">
        {taskError ? <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{taskError}</p> : null}
        {archived ? <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950">{task.title}</h1> : <input key={`${task.id}-title`} defaultValue={task.title} onBlur={(event) => { const title = event.target.value.trim(); if (title && title !== task.title) void update({ title }); }} className="w-full border-0 p-0 text-2xl font-semibold leading-tight tracking-tight text-slate-950 outline-none" aria-label="Görev başlığı" />}
        <p className="mt-2 text-sm font-medium text-slate-500">{company?.name} <span className="mx-1 text-slate-300">/</span> {project?.name}</p>

        {completed ? <>
          <section className="mt-7"><h2 className="section-title">Görev Bilgileri</h2><div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Açıklama</p><p className="mt-1 text-sm leading-6 text-slate-600">{task.description}</p></div><dl className="mt-5 grid gap-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2">
            <InfoItem label="Görev adı">{task.title}</InfoItem><InfoItem label="Firma">{company?.name}</InfoItem><InfoItem label="Proje">{project?.name}</InfoItem><InfoItem label="Sorumlu">{assignee?.name}</InfoItem><InfoItem label="Öncelik">{priorityLabels[task.priority]}</InfoItem><InfoItem label="Oluşturulma tarihi">{formatDate(task.createdAt, true)}</InfoItem><InfoItem label="Son tarih">{formatDate(task.dueDate, true)}, {task.dueTime ?? "17:00"}</InfoItem><InfoItem label="Tamamlanma tarihi">{task.completedAt ? formatDate(task.completedAt, true) : "—"}</InfoItem>
          </dl></section>
          <section className="mt-7"><h2 className="section-title">Tamamlama Raporu</h2><div className="mt-3 rounded-xl border border-slate-200 p-4"><div className="space-y-3">{completionItems.map(([key, label]) => { const checked = Boolean(task.completionChecklist?.[key]); return <div key={key} className="flex items-center gap-3 text-sm text-slate-700"><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-slate-50"}`}>{checked ? <Check size={13} /> : null}</span>{label}</div>; })}</div><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sonuç Notu</p><p className="mt-1 text-sm leading-6 text-slate-700">{task.resultNote}</p>{task.completionNote ? <><p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Ek Not</p><p className="mt-1 text-sm leading-6 text-slate-600">{task.completionNote}</p></> : null}</div></div></section>
        </> : cancelled ? <section className="mt-7"><h2 className="section-title">Görev Bilgileri</h2><div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Açıklama</p><p className="mt-1 text-sm leading-6 text-slate-600">{task.description}</p></div><dl className="mt-5 grid gap-5 rounded-xl border border-rose-100 bg-rose-50/30 p-4 sm:grid-cols-2">
          <InfoItem label="Görev adı">{task.title}</InfoItem><InfoItem label="Firma">{company?.name}</InfoItem><InfoItem label="Proje">{project?.name}</InfoItem><InfoItem label="Sorumlu">{assignee?.name}</InfoItem><InfoItem label="Oluşturulma tarihi">{formatDate(task.createdAt, true)}</InfoItem><InfoItem label="Eski son tarih">{formatDate(task.dueDate, true)}, {task.dueTime ?? "17:00"}</InfoItem><InfoItem label="İptal / silinme tarihi">{task.cancelledAt ? formatDate(task.cancelledAt, true) : "—"}</InfoItem><InfoItem label="Silinme nedeni">{task.deletionReason}</InfoItem>{task.deletionNote ? <div className="sm:col-span-2"><InfoItem label="Ek Not">{task.deletionNote}</InfoItem></div> : null}
        </dl></section> : <>
          <textarea key={`${task.id}-description`} defaultValue={task.description} onBlur={(event) => { if (event.target.value !== task.description) void update({ description: event.target.value }); }} className="mt-6 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" aria-label="Açıklama" />
          <section className="mt-6 grid gap-x-5 gap-y-4 border-y border-slate-100 py-5 sm:grid-cols-2">
            <div className="field-label">Sorumlu<div className="relative"><ThemedSelect disabled={taskSaving} className="input pl-11" ariaLabel="Sorumlu" value={task.assigneeId} onValueChange={(value) => { const user = users.find((item) => item.id === value); void updateWithActivity({ assigneeId: value }, `${user?.name ?? "Kullanıcı"} adlı kişiye atandı`, "assignee_changed"); }} options={users.map((user) => ({ value: user.id, label: user.name }))} /><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"><UserAvatar userId={task.assigneeId} size="sm" /></span></div></div>
            <div className="grid gap-3 min-[430px]:grid-cols-[minmax(0,1fr)_110px]">
              <label className="field-label">Son Tarih<div className="relative"><CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input disabled={taskSaving} type="date" lang="tr" className="input pl-9" value={task.dueDate} onChange={(event) => void updateWithActivity({ dueDate: event.target.value, dueTime: task.dueTime ?? "17:00" }, `Son tarih ${formatDate(event.target.value, true)} olarak değiştirildi`, "due_date_changed")} /></div></label>
              <label className="field-label">Saat<div className="relative"><Clock3 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input disabled={taskSaving} type="time" lang="tr" className="input pl-9" value={task.dueTime ?? "17:00"} onChange={(event) => void updateWithActivity({ dueDate: task.dueDate, dueTime: event.target.value }, `Son tarih saati ${event.target.value} olarak değiştirildi`, "due_date_changed")} /></div></label>
            </div>
            <div className="field-label">Durum<ThemedSelect disabled={taskSaving} ariaLabel="Durum" value={task.status} onValueChange={(value) => { const status = value as Status; void updateWithActivity({ status }, `Durum “${statusLabels[status]}” yapıldı`, "status_changed"); }} options={activeStatuses.map((item) => ({ value: item, label: statusLabels[item] }))} /></div>
            <div className="field-label">Öncelik<ThemedSelect disabled={taskSaving} ariaLabel="Öncelik" value={task.priority} onValueChange={(value) => void update({ priority: value as Priority })} options={(["Low", "Medium", "High", "Urgent"] as Priority[]).map((item) => ({ value: item, label: priorityLabels[item] }))} /></div>
            <div className="field-label">Boyut<ThemedSelect disabled={taskSaving} ariaLabel="Boyut" value={task.size} onValueChange={(value) => void update({ size: value as TaskSize })} options={["S", "M", "L", "XL"].map((item) => ({ value: item, label: item }))} /></div>
            <div className="field-label">Proje<ThemedSelect disabled={taskSaving} ariaLabel="Proje" value={task.projectId} onValueChange={(value) => { const next = projects.find((item) => item.id === value); if (next) void updateWithActivity({ projectId: next.id, companyId: next.companyId }, `Proje “${next.name}” olarak değiştirildi`, "project_changed"); }} options={projects.map((item) => ({ value: item.id, label: item.name }))} /></div>
          </section>
          <section className="mt-6">
            <ReminderPresetPicker disabled={taskSaving} value={task.reminders ?? []} onChange={(reminders) => void updateWithActivity({ reminders }, "Hatırlatmalar güncellendi", "reminders_updated")} />
          </section>
          <section className="mt-6"><div className="flex items-center justify-between"><h2 className="section-title">Alt görevler</h2><span className="text-xs font-semibold text-slate-400">{done}/{task.checklist.length}</span></div><div className="ofus-progress" role="progressbar" aria-label="Alt görev ilerlemesi" aria-valuenow={task.checklist.length ? Math.round(done / task.checklist.length * 100) : 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${task.checklist.length ? done / task.checklist.length * 100 : 0}%` }} /></div><div className="mt-3 space-y-2">{task.checklist.length ? task.checklist.map((item) => <button disabled={taskSaving} key={item.id} onClick={() => void updateWithActivity({ checklist: task.checklist.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry) }, `Alt görev güncellendi: ${item.label}`, "checklist_updated")} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"}`}>{item.done ? <Check size={13} /> : null}</span><span className={item.done ? "text-slate-400 line-through" : ""}>{item.label}</span></button>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400">Henüz alt görev yok.</p>}</div><div className="ofus-subtask-form"><input className="input mt-0" maxLength={180} value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addSubtask(); } }} placeholder="Yeni alt görev" aria-label="Yeni alt görev" /><button className="secondary-button" type="button" disabled={!newSubtask.trim() || taskSaving} onClick={() => void addSubtask()}><Plus size={15} />Ekle</button></div></section>
          <section className="mt-7"><h2 className="section-title">Etiketler</h2><div className="mt-3 flex flex-wrap gap-2">{task.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">#{tag}</span>)}</div></section>
          <section className="mt-7"><h2 className="section-title">Not</h2><div className="mt-3 flex gap-3 rounded-xl border border-slate-200 p-4"><div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><MessageSquare size={16} /></div><textarea key={`${task.id}-notes`} defaultValue={task.notes ?? ""} onBlur={(event) => { if (event.target.value !== (task.notes ?? "")) void updateWithActivity({ notes: event.target.value }, "Not güncellendi", "note_updated"); }} className="min-h-16 w-full resize-none border-0 p-0 text-sm leading-5 text-slate-500 outline-none" aria-label="Not" /></div></section>
        </>}

        <div className="mt-7 space-y-4"><ResourceLinksSection key={`task-${task.id}`} ownerType="task" ownerId={task.id} title="Bağlantılar" />{project ? <ResourceLinksSection key={`project-${project.id}`} ownerType="project" ownerId={project.id} title="Projeden Gelen Kaynaklar" readOnly editHref={`/projects/${project.id}`} /> : null}</div>

        <section className="mt-7"><h2 className="section-title">Hareket Geçmişi</h2><div className="mt-3 space-y-0 rounded-xl border border-slate-200 p-4">{activities.length ? activities.map((activity, index) => { const user = users.find((item) => item.id === activity.userId); return <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">{index < activities.length - 1 ? <span className="absolute bottom-0 left-[13px] top-7 w-px bg-slate-200" /> : null}<UserAvatar userId={activity.userId} size="sm" /><div><p className="text-sm font-medium text-slate-700">{activity.description}</p><p className="mt-0.5 text-[11px] text-slate-400">{user?.name} · {formatActivityDate(activity.createdAt)}</p></div></div>; }) : <p className="text-sm text-slate-400">Henüz hareket kaydı yok.</p>}</div></section>
      </div>
      <nav className="ofus-detail-nav mx-4 mb-3" aria-label="Görevler arasında gezinme"><button type="button" disabled={!previousTask} onClick={() => previousTask && goToTask(previousTask)}><ChevronLeft size={18} /><span><small>Önceki görev</small><b>{previousTask?.title ?? "Başlangıç"}</b></span></button><button type="button" disabled={!nextTask} onClick={() => nextTask && goToTask(nextTask)}><span><small>Sonraki görev</small><b>{nextTask?.title ?? "Son"}</b></span><ChevronRight size={18} /></button></nav>
      {!archived ? <footer className="grid shrink-0 grid-cols-2 items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:flex sm:justify-between sm:px-5"><button onClick={() => setDeletionTask(task)} className="inline-flex h-9 items-center justify-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700"><Trash2 size={15} />Görevi Sil</button><button onClick={() => setCompletionTask(task)} className="primary-button completion-button"><CheckCircle2 size={15} />Görevi Tamamla</button></footer> : <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right text-[11px] text-slate-400">{completed ? "Tamamlanan" : "İptal edilen"} görevler yalnızca okunur</footer>}
    </aside>
  </div>;
}
