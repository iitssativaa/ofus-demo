"use client";

import { useRef, useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import type { DeletionReason, Task } from "@/lib/types";
import { useWorkspace } from "./app-provider";

const reasons: DeletionReason[] = ["Müşteri işi iptal etti", "İş artık gerekli değil", "Başka görevle birleştirildi", "Yanlış eklendi", "Diğer"];

export function TaskDeletionDialog() {
  const { deletionTask } = useWorkspace();
  return deletionTask ? <DeletionForm key={deletionTask.id} task={deletionTask} /> : null;
}

function DeletionForm({ task }: { task: Task }) {
  const { setDeletionTask, deleteTask, taskSaving, taskError, clearTaskError } = useWorkspace();
  const [reason, setReason] = useState<DeletionReason | "">("");
  const [note, setNote] = useState("");
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !taskSaving) { clearTaskError(); setDeletionTask(null); } };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason || submissionLock.current || taskSaving) return;
    submissionLock.current = true;
    try { await deleteTask(task.id, { reason, note: note.trim() || undefined }); }
    catch {
      submissionLock.current = false;
      /* Sağlayıcı Türkçe hata durumunu gösterir. */
    }
  };

  return <div className="responsive-dialog z-[70] bg-slate-950/35" role="dialog" aria-modal="true" aria-label="Görevi Sil">
    <button className="absolute inset-0" onClick={close} aria-label="Silme formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-lg">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-semibold text-slate-950">Görevi Sil</h2><p className="mt-1 text-xs leading-5 text-slate-500">Silinen işler, yanlışlıkla eklenmediyse iptal kaydı olarak saklanır.</p></div><button type="button" onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body space-y-5 p-4 sm:p-5">
        {taskError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{taskError}</p> : null}
        <fieldset><legend className="field-label">Silinme Nedeni</legend><div className="mt-2 space-y-2">{reasons.map((item) => <label key={item} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${reason === item ? item === "Yanlış eklendi" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><input required type="radio" name="deletion-reason" value={item} checked={reason === item} onChange={() => setReason(item)} className="mt-0.5 accent-indigo-600" /><span><span className="font-medium">{item}</span>{item === "Yanlış eklendi" ? <span className="mt-1 block text-xs font-normal leading-5 text-rose-600">Bu görev yanlışlıkla oluşturulduysa arşive alınmadan tamamen silinir.</span> : null}</span></label>)}</div></fieldset>
        {reason === "Diğer" ? <label className="field-label">Açıklama<textarea className="input min-h-20 resize-none" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Silinme nedenini kısaca açıklayın…" /></label> : reason && reason !== "Yanlış eklendi" ? <label className="field-label">Ek Not <span className="font-normal text-slate-400">(isteğe bağlı)</span><textarea className="input min-h-16 resize-none" value={note} onChange={(event) => setNote(event.target.value)} placeholder="İptalle ilgili ek bilgi…" /></label> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={taskSaving} onClick={close} className="secondary-button">Vazgeç</button><button type="submit" disabled={!reason || taskSaving} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={15} />{taskSaving ? "Kaydediliyor…" : "Görevi Sil"}</button></footer>
    </form>
  </div>;
}
