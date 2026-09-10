"use client";
import { useDialogFocus } from "./use-dialog-focus";

import { useRef, useState, type FormEvent } from "react";
import { FolderKanban, Plus, X } from "lucide-react";
import type { Company, Project, ProjectInput } from "@/lib/types";
import { ThemedSelect } from "./themed-select";
import { useFormDrafts } from "./form-draft-provider";
import { useDialogExit } from "./use-dialog-exit";
import "./detail-fidelity.css";

const projectCreateDraftKey = "project:create";

export function ProjectFormDialog({ project, companies, onCancel, onSave }: { project?: Project; companies: Company[]; onCancel: () => void; onSave: (input: ProjectInput) => Promise<void> }) {
  const drafts = useFormDrafts();
  const { closing, requestClose } = useDialogExit();
  const [form, setForm] = useState<ProjectInput>(project ? { name: project.name, companyId: project.companyId, status: project.status, description: project.description, notes: project.notes } : drafts.get<ProjectInput>(projectCreateDraftKey) ?? { name: "", companyId: companies[0]?.id ?? "", status: "Active", description: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !submitting) { if (!project) drafts.set(projectCreateDraftKey, form); requestClose(onCancel); } };
  const discard = () => { if (!submissionLock.current && !submitting) { if (!project) drafts.clear(projectCreateDraftKey); requestClose(onCancel); } };
  useDialogFocus(true, close);
  const setField = <K extends keyof ProjectInput>(field: K, value: ProjectInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Proje adı boş bırakılamaz.");
    if (!form.companyId) return setError("Firma seçmelisiniz.");
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    try { await onSave({ ...form, name: form.name.trim() }); if (!project) drafts.clear(projectCreateDraftKey); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Proje kaydedilemedi."); submissionLock.current = false; setSubmitting(false); }
  };
  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="project-form-title" inert={closing} style={{ opacity: closing ? 0 : 1, transition: "opacity 200ms ease" }}>
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Proje formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel ofus-reference-form max-w-[720px]" style={{ transform: closing ? "translateY(8px)" : undefined, transition: "transform 200ms ease" }}>
      <header className="flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-50 p-3 text-sky-500"><FolderKanban size={19} /></span><div><h2 id="project-form-title" className="font-semibold text-slate-950">{project ? "Projeyi düzenle" : "Yeni proje ekle"}</h2><p className="text-slate-400">Yeni bir iş için ortak çalışma alanı oluştur.</p></div></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Proje adı <span className="text-rose-500">*</span><input className="input ofus-reference-title-input" placeholder="Örn. Yeni web sitesi" maxLength={project ? undefined : 140} value={form.name} onChange={(event) => { setField("name", event.target.value); setError(""); }} /></label>
        <div className="field-label">Firma <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Firma" invalid={Boolean(error && !form.companyId)} value={form.companyId} onValueChange={(value) => setField("companyId", value)} options={[{ value: "", label: "Firma seçin" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]} /></div>
        <div className="field-label">Durum<ThemedSelect className={form.status === "Active" ? "bg-emerald-50 text-emerald-700" : form.status === "Wrapping up" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"} ariaLabel="Durum" value={form.status} onValueChange={(value) => setField("status", value as Project["status"])} options={[{ value: "Active", label: "Aktif" }, { value: "On hold", label: "Beklemede" }, { value: "Wrapping up", label: "Tamamlanıyor" }]} /></div>
        <label className="field-label sm:col-span-2">Açıklama <span className="float-right text-[11px] font-medium text-slate-400">İsteğe bağlı</span><textarea className="input ofus-reference-project-description resize-none" placeholder="Projenin amacı ve ortaya çıkacak işi kısaca anlat…" maxLength={project ? undefined : 2000} value={form.description} onChange={(event) => setField("description", event.target.value)} /></label>
        <label className="field-label sm:col-span-2">Notlar <span className="float-right text-[11px] font-medium text-slate-400">İsteğe bağlı</span><textarea className="input min-h-20 resize-none" placeholder="Başlangıç notları, önemli bağlantılar veya hatırlatmalar…" maxLength={project ? undefined : 2000} value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer items-center"><span className="mr-auto hidden text-[11px] text-slate-400 sm:block">* Gerekli alan</span><button type="button" disabled={submitting} onClick={discard} className="secondary-button">Vazgeç</button><button type="submit" disabled={submitting} className="primary-button disabled:opacity-60"><Plus size={15} />{submitting ? "Kaydediliyor…" : project ? "Projeyi Kaydet" : "Proje Ekle"}</button></footer>
    </form>
  </div>;
}


