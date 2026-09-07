"use client";

import { useRef, useState, type FormEvent } from "react";
import { Building2, X } from "lucide-react";
import type { Company, CompanyInput } from "@/lib/types";

const emptyCompany: CompanyInput = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  notes: "",
};

export function CompanyFormDialog({ company, onCancel, onSave }: { company?: Company; onCancel: () => void; onSave: (input: CompanyInput) => Promise<void> }) {
  const [form, setForm] = useState<CompanyInput>(company ? {
    name: company.name,
    contactName: company.contactName,
    phone: company.phone,
    email: company.email,
    website: company.website,
    notes: company.notes,
  } : emptyCompany);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const close = () => { if (!submissionLock.current && !submitting) onCancel(); };
  const setField = (field: keyof CompanyInput, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Firma adı boş bırakılamaz.");
      return;
    }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      await onSave({ ...form, name: form.name.trim() });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Firma kaydedilemedi.");
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="company-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Firma formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-xl shadow-slate-950/15">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Building2 size={17} /></span><div><h2 id="company-form-title" className="text-sm font-semibold text-slate-950">{company ? "Firma Bilgilerini Düzenle" : "Firma Ekle"}</h2><p className="text-xs text-slate-400">{company ? "Firma iletişim bilgilerini güncelleyin." : "Yeni bir çalışma ilişkisi oluşturun."}</p></div></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Firma adı <span className="text-rose-500">*</span><input className={`input ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`} value={form.name} onChange={(event) => { setField("name", event.target.value); if (error) setError(""); }} placeholder="Örn. Atlas Teknoloji" aria-invalid={Boolean(error)} aria-describedby={error ? "company-name-error" : undefined} /></label>
        {error ? <p id="company-name-error" className="-mt-2 text-xs font-semibold text-rose-600 sm:col-span-2" role="alert">{error}</p> : null}
        <label className="field-label">Yetkili kişi<input className="input" value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} placeholder="Ad Soyad" /></label>
        <label className="field-label">Telefon<input type="tel" className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="+90 212 555 00 00" /></label>
        <label className="field-label">E-posta<input type="email" className="input" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="yetkili@firma.com" /></label>
        <label className="field-label">Web sitesi<input type="text" className="input" value={form.website} onChange={(event) => setField("website", event.target.value)} placeholder="firma.com" /></label>
        <label className="field-label sm:col-span-2">Notlar<textarea className="input min-h-24 resize-none" value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Çalışma düzeniyle ilgili kısa notlar…" /></label>
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={submitting} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={submitting} className="primary-button disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}
