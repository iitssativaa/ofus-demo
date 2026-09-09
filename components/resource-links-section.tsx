"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Code2, ExternalLink, FileText, FolderOpen, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ResourceLink, ResourceLinkInput, ResourceLinkType, ResourceOwnerType } from "@/lib/resource-links";
import { normalizeResourceUrl, resourceTypeLabels } from "@/lib/resource-links";
import { createResourceLink, deleteResourceLink, listResourceLinks, updateResourceLink } from "@/lib/supabase/resource-links-client";
import { ThemedSelect } from "./themed-select";
import { toast } from "./toast";

const resourceTypes = (Object.keys(resourceTypeLabels) as ResourceLinkType[]).map((value) => ({ value, label: resourceTypeLabels[value] }));
const typeIcons: Record<ResourceLinkType, typeof Link2> = { drive: FolderOpen, figma: Pencil, github: Code2, vercel: ExternalLink, document: FileText, other: Link2 };

function ResourceForm({ resource, saving, onCancel, onSave }: { resource?: ResourceLink; saving: boolean; onCancel: () => void; onSave: (input: ResourceLinkInput) => Promise<void> }) {
  const [form, setForm] = useState<ResourceLinkInput>({ title: resource?.title ?? "", type: resource?.type ?? "other", url: resource?.url ?? "", note: resource?.note ?? "" });
  const [error, setError] = useState("");
  const lock = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return setError("Başlık boş bırakılamaz.");
    const url = normalizeResourceUrl(form.url);
    if (!url) return setError("Geçerli bir http veya https URL'si girin.");
    if (lock.current || saving) return;
    lock.current = true;
    try { await onSave({ ...form, title: form.title.trim(), url }); }
    catch { setError("Kaynak kaydedilemedi. Lütfen tekrar deneyin."); lock.current = false; }
  };
  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="resource-form-title"><button type="button" className="absolute inset-0" onClick={onCancel} aria-label="Kaynak formunu kapat" /><form onSubmit={submit} className="responsive-dialog-panel max-w-lg"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="resource-form-title" className="text-sm font-semibold text-slate-950">{resource ? "Kaynağı Düzenle" : "Kaynak Ekle"}</h2><p className="mt-0.5 text-xs text-slate-400">Bağlantı bilgilerini kaydedin.</p></div><button type="button" onClick={onCancel} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5"><label className="field-label sm:col-span-2">Başlık <span className="text-rose-500">*</span><input className="input" value={form.title} onChange={(e) => { setForm((current) => ({ ...current, title: e.target.value })); setError(""); }} placeholder="Örn. Proje Drive klasörü" /></label><div className="field-label">Tür <span className="text-rose-500">*</span><ThemedSelect ariaLabel="Kaynak türü" value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as ResourceLinkType }))} options={resourceTypes} /></div><label className="field-label sm:col-span-2">URL <span className="text-rose-500">*</span><input type="url" className="input" value={form.url} onChange={(e) => { setForm((current) => ({ ...current, url: e.target.value })); setError(""); }} placeholder="https://…" inputMode="url" /></label><label className="field-label sm:col-span-2">Not<textarea className="input min-h-20 resize-none" value={form.note ?? ""} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} placeholder="Kısa açıklama…" /></label>{error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}</div><footer className="responsive-dialog-footer"><button type="button" className="secondary-button" onClick={onCancel}>İptal</button><button type="submit" disabled={saving} className="primary-button">{saving ? "Kaydediliyor…" : "Kaydet"}</button></footer></form></div>;
}

export function ResourceLinksSection({ ownerType, ownerId, title = "Kaynaklar", readOnly = false, editHref }: { ownerType: ResourceOwnerType; ownerId: string; title?: string; readOnly?: boolean; editHref?: string }) {
  const [resources, setResources] = useState<ResourceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ResourceLink | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ResourceLink | null>(null);
  const [saving, setSaving] = useState(false);
  const deleteLock = useRef(false);
  useEffect(() => {
    let active = true;
    void listResourceLinks(ownerType, ownerId).then((items) => { if (active) { setResources(items); setError(""); } }).catch(() => { if (active) setError("Kaynaklar yüklenemedi."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ownerId, ownerType]);
  const save = async (input: ResourceLinkInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateResourceLink(editing.id, input);
        setResources((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await createResourceLink(ownerType, ownerId, input);
        setResources((current) => [...current, created]);
      }
      setEditing(undefined);
      toast.show(editing ? "recordUpdated" : "recordUpdated", { message: editing ? "Kaynak güncellendi" : "Kaynak eklendi" });
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true;
    setSaving(true);
    try { await deleteResourceLink(deleting.id); setResources((current) => current.filter((item) => item.id !== deleting.id)); setDeleting(null); toast.show("recordDeleted", { message: "Kaynak silindi" }); }
    catch { setError("Kaynak silinemedi. Lütfen tekrar deneyin."); toast.show("saveError", { message: "Kaynak silinemedi" }); }
    finally { deleteLock.current = false; setSaving(false); }
  };

  return <section data-readonly={readOnly} className="resource-section panel overflow-hidden"><div className="panel-header"><div><h2 className="section-title">{title}</h2><p className="section-subtitle">{loading ? "Yükleniyor…" : `${resources.length} bağlantı`}</p></div>{readOnly ? editHref ? <Link href={editHref} className="text-link">Projede aç</Link> : null : <button type="button" onClick={() => setEditing(null)} className="secondary-button"><Plus size={14} />Kaynak Ekle</button>}</div>{error ? <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}<div className="divide-y divide-slate-100">{!loading && !resources.length ? <p className="p-5 text-sm text-slate-400">Henüz bağlantı eklenmedi.</p> : resources.map((resource) => { const Icon = typeIcons[resource.type]; return <article key={resource.id} className="resource-row min-w-0 items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon size={16} /></span><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-sm font-semibold text-slate-800">{resource.title}</p><span className="shrink-0 text-[10px] font-bold text-slate-400">{resourceTypeLabels[resource.type]}</span></div><a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs text-indigo-600 hover:text-indigo-800" title={resource.url}>{resource.url}</a>{resource.note ? <p className="mt-1 truncate text-[11px] text-slate-400">{resource.note}</p> : null}</div><div className="resource-actions"><a href={resource.url} target="_blank" rel="noopener noreferrer" className="icon-button shrink-0" aria-label={`${resource.title} bağlantısını aç`}><ExternalLink size={15} /></a>{!readOnly ? <><button type="button" onClick={() => setEditing(resource)} className="icon-button shrink-0" aria-label={`${resource.title} kaynağını düzenle`}><Pencil size={15} /></button><button type="button" onClick={() => setDeleting(resource)} className="icon-button shrink-0 text-rose-600" aria-label={`${resource.title} kaynağını sil`}><Trash2 size={15} /></button></> : null}</div></article>; })}</div>
    {editing !== undefined ? <ResourceForm resource={editing ?? undefined} saving={saving} onCancel={() => { if (!saving) setEditing(undefined); }} onSave={save} /> : null}
    {deleting ? <div className="responsive-dialog z-[85]" role="dialog" aria-modal="true" aria-labelledby="delete-resource-title"><button type="button" className="absolute inset-0" onClick={() => { if (!saving) setDeleting(null); }} aria-label="Silme penceresini kapat" /><section className="responsive-dialog-panel max-w-sm"><header className="border-b border-slate-100 px-5 py-4"><h2 id="delete-resource-title" className="text-sm font-semibold text-slate-950">Kaynağı Sil</h2></header><div className="responsive-dialog-body p-5 text-sm text-slate-600">“{deleting.title}” bağlantısı silinsin mi? Yalnızca bu kaynak kaydı silinecektir.</div><footer className="responsive-dialog-footer"><button type="button" disabled={saving} className="secondary-button" onClick={() => setDeleting(null)}>İptal</button><button type="button" disabled={saving} onClick={remove} className="primary-button destructive-button">{saving ? "Siliniyor…" : "Sil"}</button></footer></section></div> : null}
  </section>;
}
