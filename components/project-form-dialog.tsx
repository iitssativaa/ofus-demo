"use client";
import { useDialogFocus } from "./use-dialog-focus";

import { useRef, useState, type FormEvent } from "react";
import { FolderKanban, X } from "lucide-react";
import type { Company, Project, ProjectInput } from "@/lib/types";
import { ThemedSelect } from "./themed-select";

export function ProjectFormDialog({ project, companies, onCancel, onSave }: { project?: Project; companies: Company[]; onCancel: () => void; onSave: (input: ProjectInput) => Promise<void> }) {
  const [form, setForm] = useState<ProjectInput>(project ? { name: project.name, companyId: project.companyId, status: project.status, description: project.description, notes: project.notes } : { name: "", companyId: companies[0]?.id ?? "", status: "Active", description: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !submitting) onCancel(); };
  useDialogFocus(true, close);
  const setField = <K extends keyof ProjectInput>(field: K, value: ProjectInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Proje adı boş bırakılamaz.");
    if (!form.companyId) return setError("Firma seçmelisiniz.");
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    try { await onSave({ ...form, name: form.name.trim() }); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Proje kaydedilemedi."); submissionLock.current = false; setSubmitting(false); }
  };
  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Proje formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-[720px]">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><FolderKanban size={17} /></span><div><h2 id="project-form-title" className="text-sm font-semibold text-slate-950">{project ? "Projeyi Düzenle" : "Proje Ekle"}</h2><p className="text-xs text-slate-400">Proje ve firma bilgilerini kaydedin.</p></div></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Proje adı <span className="text-rose-500">*</span><input className="input" value={form.name} onChange={(event) => { setField("name", event.target.value); setError(""); }} /></label>
        <div className="field-label">Firma <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Firma" invalid={Boolean(error && !form.companyId)} value={form.companyId} onValueChange={(value) => setField("companyId", value)} options={[{ value: "", label: "Firma seçin" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]} /></div>
        <div className="field-label">Durum<ThemedSelect ariaLabel="Durum" value={form.status} onValueChange={(value) => setField("status", value as Project["status"])} options={[{ value: "Active", label: "Aktif" }, { value: "On hold", label: "Beklemede" }, { value: "Wrapping up", label: "Tamamlanıyor" }]} /></div>
        <label className="field-label sm:col-span-2">Açıklama<textarea className="input min-h-20 resize-none" value={form.description} onChange={(event) => setField("description", event.target.value)} /></label>
        <label className="field-label sm:col-span-2">Notlar<textarea className="input min-h-20 resize-none" value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={submitting} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={submitting} className="primary-button disabled:opacity-60">{submitting ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}


