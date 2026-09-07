"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { priorityLabels, statusLabels } from "@/lib/i18n";
import type { Priority, ReminderPreset, Status, TaskSize } from "@/lib/types";
import { addDaysIso } from "@/lib/utils";
import { deadlineToIso } from "@/lib/task-selectors";
import { useWorkspace } from "./app-provider";
import { ReminderPresetPicker } from "./reminder-preset-picker";
import { ThemedSelect } from "./themed-select";

export function QuickAddTask() {
  const { companies, projects, users, quickAddOpen, setQuickAddOpen, addTask, taskSaving, taskError, clearTaskError } = useWorkspace();
  const [more, setMore] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(addDaysIso(1));
  const [dueTime, setDueTime] = useState("17:00");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [size, setSize] = useState<TaskSize>("M");
  const [status, setStatus] = useState<Status>("To Do");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState("");
  const [reminders, setReminders] = useState<ReminderPreset[]>([]);
  const submissionLock = useRef(false);

  const effectiveAssigneeId = assigneeId || users[0]?.id || "";
  const effectiveCompanyId = companyId || companies[0]?.id || "";
  const companyProjects = useMemo(() => projects.filter((item) => item.companyId === effectiveCompanyId), [projects, effectiveCompanyId]);
  const selectedProject = companyProjects.find((item) => item.id === projectId) ?? companyProjects[0];
  const assigneeIsValid = users.some((user) => user.id === effectiveAssigneeId);
  const dueAt = deadlineToIso(dueDate, dueTime);
  const canSubmit = Boolean(title.trim()) && assigneeIsValid && Boolean(dueAt);

  if (!quickAddOpen) return null;
  const close = () => { if (submissionLock.current || taskSaving) return; clearTaskError(); setValidationError(""); setQuickAddOpen(false); setMore(false); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionLock.current || taskSaving) return;
    clearTaskError();
    if (!title.trim()) return setValidationError("Görev adı zorunludur.");
    if (!assigneeIsValid) return setValidationError("Geçerli bir sorumlu seçmelisiniz.");
    if (!dueAt) return setValidationError("Geçerli bir son tarih ve saat seçmelisiniz.");
    if (!effectiveCompanyId || !selectedProject) return setValidationError("Firma ve proje seçmelisiniz.");
    submissionLock.current = true;
    setValidationError("");
    try {
      await addTask({ title: title.trim(), description: notes.trim() || "", assigneeId: effectiveAssigneeId, dueDate, dueTime, projectId: selectedProject.id, companyId: effectiveCompanyId, priority, size, status, notes: notes.trim(), tags: [], checklist: [], reminders });
      setTitle("");
      setNotes("");
      setMore(false);
      setReminders([]);
    } catch {
      submissionLock.current = false;
      /* Sağlayıcı Türkçe hata durumunu gösterir. */
    }
  };

  const error = validationError || taskError;
  return (
    <div className="responsive-dialog z-[60]" role="dialog" aria-modal="true" aria-label="Hızlı Görev Ekle">
      <button type="button" className="absolute inset-0" onClick={close} aria-label="Hızlı görev formunu kapat" />
      <form onSubmit={save} className="responsive-dialog-panel max-w-xl shadow-slate-950/15">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-sm font-semibold text-slate-950">Hızlı Görev Ekle</p><p className="text-xs text-slate-400">Görev doğrudan çalışma planına eklenir.</p></div><button type="button" onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></div>
        <div className="responsive-dialog-body space-y-4 p-4 sm:p-5">
          {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
          <input value={title} onChange={(event) => { setTitle(event.target.value); setValidationError(""); }} className="w-full border-0 p-0 text-xl font-semibold text-slate-950 outline-none placeholder:text-slate-300" placeholder="Ne yapılması gerekiyor?" aria-label="Görev adı" required />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
            <div className="field-label">Sorumlu<ThemedSelect ariaLabel="Sorumlu" value={effectiveAssigneeId} onValueChange={(value) => { setAssigneeId(value); setValidationError(""); }} options={[{ value: "", label: "Sorumlu seçin" }, ...users.map((user) => ({ value: user.id, label: user.name }))]} /></div>
            <label className="field-label">Son Tarih<input required type="date" lang="tr" aria-label="Son Tarih" className="input" value={dueDate} onChange={(event) => { setDueDate(event.target.value); setValidationError(""); }} /></label>
            <label className="field-label">Saat<input required type="time" lang="tr" aria-label="Saat" className="input" value={dueTime} onChange={(event) => { setDueTime(event.target.value); setValidationError(""); }} /></label>
          </div>
          <ReminderPresetPicker value={reminders} onChange={setReminders} />
          <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">Daha Fazla Seçenek <ChevronDown size={14} className={more ? "rotate-180" : ""} /></button>
          {more ? <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <div className="field-label">Firma<ThemedSelect ariaLabel="Firma" value={effectiveCompanyId} onValueChange={(value) => { setCompanyId(value); setProjectId(""); }} options={[{ value: "", label: "Firma seçin" }, ...companies.map((item) => ({ value: item.id, label: item.name }))]} /></div>
            <div className="field-label">Proje<ThemedSelect ariaLabel="Proje" value={selectedProject?.id ?? ""} onValueChange={setProjectId} options={[{ value: "", label: "Proje seçin" }, ...companyProjects.map((item) => ({ value: item.id, label: item.name }))]} /></div>
            <div className="field-label">Öncelik<ThemedSelect ariaLabel="Öncelik" value={priority} onValueChange={(value) => setPriority(value as Priority)} options={(["Low", "Medium", "High", "Urgent"] as Priority[]).map((item) => ({ value: item, label: priorityLabels[item] }))} /></div>
            <div className="field-label">Boyut<ThemedSelect ariaLabel="Boyut" value={size} onValueChange={(value) => setSize(value as TaskSize)} options={["S", "M", "L", "XL"].map((item) => ({ value: item, label: item }))} /></div>
            <div className="field-label">Durum<ThemedSelect ariaLabel="Durum" value={status} onValueChange={(value) => setStatus(value as Status)} options={(["To Do", "In Progress", "Waiting", "Review"] as Status[]).map((item) => ({ value: item, label: statusLabels[item] }))} /></div>
            <label className="field-label sm:col-span-2">Not<textarea className="input min-h-20 resize-none" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Bağlam, bağlantılar veya kısa bir açıklama…" /></label>
          </div> : null}
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5"><button type="submit" disabled={taskSaving || !canSubmit} className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Plus size={15} />{taskSaving ? "Kaydediliyor…" : "Görev Ekle"}</button></div>
      </form>
    </div>
  );
}
