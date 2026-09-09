"use client";
import { useDialogFocus } from "./use-dialog-focus";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, X } from "lucide-react";
import Image from "next/image";
import type { Company, CompanyInput } from "@/lib/types";
import { normalizeResourceUrl } from "@/lib/resource-links";
import { validateCompanyLogo } from "@/lib/supabase/company-logos";
import { CompanyLogo } from "./company-logo";

const emptyCompany: CompanyInput = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  linkedinUrl: "",
  notes: "",
};

export function CompanyFormDialog({ company, onCancel, onSave }: { company?: Company; onCancel: () => void; onSave: (input: CompanyInput) => Promise<void> }) {
  const [form, setForm] = useState<CompanyInput>(company ? {
    name: company.name,
    contactName: company.contactName,
    phone: company.phone,
    email: company.email,
    website: company.website,
    linkedinUrl: company.linkedinUrl,
    notes: company.notes,
  } : emptyCompany);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null | undefined>(undefined);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [logoValidating, setLogoValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoSelectionVersion = useRef(0);
  const logoPreviewRef = useRef<string | null>(null);
  const [mutationId] = useState(() => crypto.randomUUID());
  useEffect(() => () => {
    logoSelectionVersion.current += 1;
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
  }, []);
  const close = () => { if (!submissionLock.current && !submitting) onCancel(); };
  useDialogFocus(true, close);
  const setField = (field: "name" | "contactName" | "phone" | "email" | "website" | "linkedinUrl" | "notes", value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (logoValidating || logoError) return;
    if (!form.name.trim()) {
      setError("Firma adı boş bırakılamaz.");
      return;
    }
    if (form.linkedinUrl.trim() && !normalizeResourceUrl(form.linkedinUrl)) {
      setError("Geçerli bir LinkedIn bağlantısı girin.");
      return;
    }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      await onSave({ ...form, name: form.name.trim(), logoFile, mutationId });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Firma kaydedilemedi.");
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="company-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Firma formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-[720px] shadow-slate-950/15">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Building2 size={17} /></span><div><h2 id="company-form-title" className="text-sm font-semibold text-slate-950">{company ? "Firma Bilgilerini Düzenle" : "Firma Ekle"}</h2><p className="text-xs text-slate-400">{company ? "Firma iletişim bilgilerini güncelleyin." : "Yeni bir çalışma ilişkisi oluşturun."}</p></div></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Firma adı <span className="text-rose-500">*</span><input className={`input ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`} value={form.name} onChange={(event) => { setField("name", event.target.value); if (error) setError(""); }} placeholder="Firma adını girin" aria-invalid={Boolean(error)} aria-describedby={error ? "company-name-error" : undefined} /></label>
        {error ? <p id="company-name-error" className="-mt-2 text-xs font-semibold text-rose-600 sm:col-span-2" role="alert">{error}</p> : null}
        <label className="field-label">Yetkili kişi<input className="input" value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} placeholder="Ad Soyad" /></label>
        <label className="field-label">Telefon<input type="tel" className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Telefon numarasını girin" /></label>
        <label className="field-label">E-posta<input type="email" className="input" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="yetkili@firma.com" /></label>
        <label className="field-label">Web sitesi<input type="text" className="input" value={form.website} onChange={(event) => setField("website", event.target.value)} placeholder="firma.com" /></label>
        <label className="field-label sm:col-span-2">LinkedIn<input type="url" className="input" value={form.linkedinUrl} onChange={(event) => { setField("linkedinUrl", event.target.value); if (error) setError(""); }} placeholder="https://www.linkedin.com/company/..." /></label>
        <div className="field-label sm:col-span-2"><span>Firma logosu</span><div className="mt-1 flex items-center gap-3"><span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">{logoPreview ? <Image src={logoPreview} alt="Logo önizlemesi" width={56} height={56} unoptimized className="h-full w-full object-contain" /> : logoFile === null ? <Building2 size={24} strokeWidth={1.5} aria-hidden="true" /> : <CompanyLogo path={company?.logoUrl ?? null} className="h-full w-full object-contain" iconSize={24} />}</span><div className="flex flex-wrap items-center gap-2"><input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Firma logosu seç" disabled={logoValidating || submitting} onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; const selectionVersion = logoSelectionVersion.current + 1; logoSelectionVersion.current = selectionVersion; setLogoValidating(true); try { await validateCompanyLogo(file); if (logoSelectionVersion.current === selectionVersion) { const previewUrl = URL.createObjectURL(file); if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current); logoPreviewRef.current = previewUrl; setLogoPreview(previewUrl); setLogoFile(file); setLogoError(""); } } catch (validationError) { if (logoSelectionVersion.current === selectionVersion) { setLogoError(validationError instanceof Error ? validationError.message : "Logo doğrulanamadı."); input.value = ""; } } finally { if (logoSelectionVersion.current === selectionVersion) setLogoValidating(false); } }} /><button type="button" disabled={logoValidating || submitting} className="secondary-button" onClick={() => logoInput.current?.click()}>{logoValidating ? "Doğrulanıyor…" : "Logo seç"}</button>{Boolean(company?.logoUrl || logoFile) && <button type="button" disabled={logoValidating || submitting} className="secondary-button" onClick={() => { logoSelectionVersion.current += 1; if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current); logoPreviewRef.current = null; setLogoPreview(null); setLogoFile(null); setLogoError(""); if (logoInput.current) logoInput.current.value = ""; }}>Kaldır</button>}<span className="text-xs text-slate-400">PNG, JPEG veya WebP · En fazla 5 MB</span></div></div>{logoError ? <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{logoError}</p> : null}</div>
        <label className="field-label sm:col-span-2">Notlar<textarea className="input min-h-24 resize-none" value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Çalışma düzeniyle ilgili kısa notlar…" /></label>
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={submitting} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={submitting || logoValidating || Boolean(logoError)} className="primary-button disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}


