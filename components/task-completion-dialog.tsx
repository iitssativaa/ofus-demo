"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import type { CompletionChecklist, Task } from "@/lib/types";
import { todayIso } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { Checkbox } from "./checkbox";
import { useDialogFocus } from "./use-dialog-focus";

const checklistItems: { key: keyof CompletionChecklist; label: string }[] = [
  { key: "delivered", label: "Teslim edildi" },
  { key: "feedbackReceived", label: "Müşteriden dönüt alındı" },
  { key: "revisionsCompleted", label: "Gerekli revizeler tamamlandı" },
  { key: "successfullyClosed", label: "Başarılı şekilde kapatıldı" },
];

const emptyChecklist: CompletionChecklist = { delivered: false, feedbackReceived: false, revisionsCompleted: false, successfullyClosed: false };

export function TaskCompletionDialog() {
  const { completionTask } = useWorkspace();
  return completionTask ? <CompletionForm key={completionTask.id} task={completionTask} /> : null;
}

function CompletionForm({ task }: { task: Task }) {
  const { setCompletionTask, completeTask, taskSaving, taskError, clearTaskError } = useWorkspace();
  const [completedAt, setCompletedAt] = useState(todayIso());
  const [checklist, setChecklist] = useState<CompletionChecklist>(emptyChecklist);
  const [resultNote, setResultNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const submissionLock = useRef(false);

  const close = () => { if (!submissionLock.current && !taskSaving) { clearTaskError(); setCompletionTask(null); } };
  useDialogFocus(true, close);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!resultNote.trim() || submissionLock.current || taskSaving) return;
    submissionLock.current = true;
    try { await completeTask(task.id, { completedAt, completionChecklist: checklist, resultNote: resultNote.trim(), completionNote: completionNote.trim() || undefined }); }
    catch {
      submissionLock.current = false;
      /* Sağlayıcı Türkçe hata durumunu gösterir. */
    }
  };

  return <div className="responsive-dialog z-[70] bg-slate-950/35" role="dialog" aria-modal="true" aria-label="Görevi Tamamla">
    <button className="absolute inset-0" onClick={close} aria-label="Tamamlama formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-lg">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-semibold text-slate-950">Görevi Tamamla</h2><p className="mt-1 text-xs text-slate-400">{task.title}</p></div><button type="button" onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body space-y-5 p-4 sm:p-5">
        {taskError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{taskError}</p> : null}
        <section><h3 className="section-title">Tamamlama Kontrolü</h3><p className="section-subtitle">Yalnızca geçerli olan maddeleri seçin.</p><div className="mt-3 space-y-2">{checklistItems.map((item) => <label key={item.key} className={`group flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 ${taskSaving ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><Checkbox checked={checklist[item.key]} disabled={taskSaving} tone="success" ariaLabel={item.label} onChange={(checked) => setChecklist((current) => ({ ...current, [item.key]: checked }))} /><span>{item.label}</span></label>)}</div></section>
        <label className="field-label">Tamamlanma Tarihi<input required type="date" lang="tr" className="input" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} /></label>
        <label className="field-label">Sonuç Notu<textarea required className="input min-h-20 resize-none" value={resultNote} onChange={(event) => setResultNote(event.target.value)} placeholder="İşin hangi sonuçla kapandığını kısaca yazın…" /></label>
        <label className="field-label">Ek Not <span className="font-normal text-slate-400">(isteğe bağlı)</span><textarea className="input min-h-16 resize-none" value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} placeholder="Ek tamamlama bilgisi…" /></label>
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={taskSaving} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={taskSaving} className="primary-button completion-button disabled:cursor-not-allowed disabled:opacity-50"><Check size={15} />{taskSaving ? "Tamamlanıyor…" : "Görevi Tamamla"}</button></footer>
    </form>
  </div>;
}
