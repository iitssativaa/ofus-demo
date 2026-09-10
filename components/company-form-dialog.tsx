"use client";
import { useDialogFocus } from "./use-dialog-focus";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, Plus, X } from "lucide-react";
import Image from "next/image";
import type { Company, CompanyInput } from "@/lib/types";
import { normalizeResourceUrl } from "@/lib/resource-links";
import { validateCompanyLogo } from "@/lib/supabase/company-logos";
import { CompanyLogo } from "./company-logo";
import { useFormDrafts } from "./form-draft-provider";
import { useDialogExit } from "./use-dialog-exit";
import "./detail-fidelity.css";

const emptyCompany: CompanyInput = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  linkedinUrl: "",
  notes: "",
};
type CompanyCreateDraft = { form: CompanyInput; logoFile?: File | null };
const companyCreateDraftKey = "company:create";

function CompanyFilePreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <Image ref={image} src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Logo önizlemesi" width={56} height={56} unoptimized className="h-full w-full object-contain" />;
}

export function CompanyFormDialog({ company, onCancel, onSave }: { company?: Company; onCancel: () => void; onSave: (input: CompanyInput) => Promise<void> }) {
  const drafts = useFormDrafts();
  const { closing, requestClose } = useDialogExit();
  const savedDraft = company ? undefined : drafts.get<CompanyCreateDraft>(companyCreateDraftKey);
  const [form, setForm] = useState<CompanyInput>(company ? {
    name: company.name,
    contactName: company.contactName,
    phone: company.phone,
    email: company.email,
    website: company.website,
    linkedinUrl: company.linkedinUrl,
    notes: company.notes,
  } : savedDraft?.form ?? emptyCompany);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null | undefined>(company ? undefined : savedDraft?.logoFile);
  const [logoError, setLogoError] = useState("");
  const [logoValidating, setLogoValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoSelectionVersion = useRef(0);
  const [mutationId] = useState(() => crypto.randomUUID());
  useEffect(() => () => {
    logoSelectionVersion.current += 1;
  }, []);
  const close = () => { if (!submissionLock.current && !submitting) { if (!company) drafts.set<CompanyCreateDraft>(companyCreateDraftKey, { form, logoFile }); requestClose(onCancel); } };
  const discard = () => { if (!submissionLock.current && !submitting) { if (!company) drafts.clear(companyCreateDraftKey); requestClose(onCancel); } };
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
      if (!company) drafts.clear(companyCreateDraftKey);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Firma kaydedilemedi.");
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="company-form-title" inert={closing} style={{ opacity: closing ? 0 : 1, transition: "opacity 200ms ease" }}>
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Firma formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel ofus-reference-form max-w-[720px] shadow-slate-950/15" style={{ transform: closing ? "translateY(8px)" : undefined, transition: "transform 200ms ease" }}>
      <header className="flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-50 p-3 text-sky-500"><Building2 size={19} /></span><div><h2 id="company-form-title" className="font-semibold text-slate-950">{company ? "Firma bilgilerini düzenle" : "Yeni firma ekle"}</h2><p className="text-slate-400">{company ? "Firma iletişim bilgilerini güncelleyin." : "Yeni bir çalışma ilişkisi başlat."}</p></div></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Firma adı <span className="text-rose-500">*</span><input className={`input ofus-reference-title-input ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`} maxLength={company ? undefined : 140} value={form.name} onChange={(event) => { setField("name", event.target.value); if (error) setError(""); }} placeholder="Örn. Atlas Teknoloji" aria-invalid={Boolean(error)} aria-describedby={error ? "company-name-error" : undefined} /></label>
        {error ? <p id="company-name-error" className="-mt-2 text-xs font-semibold text-rose-600 sm:col-span-2" role="alert">{error}</p> : null}
        <div className="field-label sm:col-span-2"><span>Firma logosu</span><span className="float-right text-[11px] font-medium text-slate-400">İsteğe bağlı</span><div className="ofus-reference-logo-drop mt-2 flex items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sky-500">{logoFile instanceof File ? <CompanyFilePreview file={logoFile} /> : logoFile === null ? <Building2 size={24} strokeWidth={1.5} aria-hidden="true" /> : <CompanyLogo path={company?.logoUrl ?? null} className="h-full w-full object-contain" iconSize={24} />}</span><div className="flex flex-wrap items-center gap-2"><input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Firma logosu seç" disabled={logoValidating || submitting} onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; const selectionVersion = logoSelectionVersion.current + 1; logoSelectionVersion.current = selectionVersion; setLogoValidating(true); try { await validateCompanyLogo(file); if (logoSelectionVersion.current === selectionVersion) { setLogoFile(file); setLogoError(""); } } catch (validationError) { if (logoSelectionVersion.current === selectionVersion) { setLogoError(validationError instanceof Error ? validationError.message : "Logo doğrulanamadı."); input.value = ""; } } finally { if (logoSelectionVersion.current === selectionVersion) setLogoValidating(false); } }} /><button type="button" disabled={logoValidating || submitting} className="text-sm font-semibold text-sky-500" onClick={() => logoInput.current?.click()}>{logoValidating ? "Doğrulanıyor…" : "Logo yükle"}</button>{Boolean(company?.logoUrl || logoFile) && <button type="button" disabled={logoValidating || submitting} className="text-xs font-semibold text-rose-500" onClick={() => { logoSelectionVersion.current += 1; setLogoFile(null); setLogoError(""); if (logoInput.current) logoInput.current.value = ""; }}>Kaldır</button>}<span className="basis-full text-xs text-slate-400">PNG, JPEG veya WebP · En fazla 5 MB</span></div></div>{logoError ? <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{logoError}</p> : null}</div>
        <label className="field-label">Yetkili kişi<input className="input" maxLength={company ? undefined : 100} value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} placeholder="Ad Soyad" /></label>
        <label className="field-label">Telefon<input type="tel" className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Telefon numarasını girin" /></label>
        <label className="field-label">E-posta<input type="email" className="input" maxLength={company ? undefined : 254} value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="yetkili@firma.com" /></label>
        <label className="field-label">Web sitesi<input type="text" className="input" maxLength={company ? undefined : 300} value={form.website} onChange={(event) => setField("website", event.target.value)} placeholder="firma.com" /></label>
        <label className="field-label sm:col-span-2">LinkedIn<input type="url" className="input" value={form.linkedinUrl} onChange={(event) => { setField("linkedinUrl", event.target.value); if (error) setError(""); }} placeholder="https://www.linkedin.com/company/..." /></label>
        <label className="field-label sm:col-span-2">Notlar <span className="float-right text-[11px] font-medium text-slate-400">İsteğe bağlı</span><textarea className="input min-h-24 resize-none" maxLength={company ? undefined : 2000} value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Çalışma düzeni, önemli bilgiler veya kısa notlar…" /></label>
      </div>
      <footer className="responsive-dialog-footer items-center"><span className="mr-auto hidden text-[11px] text-slate-400 sm:block">* Gerekli alan</span><button type="button" disabled={submitting} onClick={discard} className="secondary-button">Vazgeç</button><button type="submit" disabled={submitting || logoValidating || Boolean(logoError)} className="primary-button disabled:cursor-not-allowed disabled:opacity-60"><Plus size={15} />{submitting ? "Kaydediliyor…" : company ? "Firmayı Kaydet" : "Firma Ekle"}</button></footer>
    </form>
  </div>;
}


