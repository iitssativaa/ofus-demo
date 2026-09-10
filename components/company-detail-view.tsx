"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clipboard, ExternalLink, Mail, Pencil, Phone, Trash2, UserRound, X } from "lucide-react";
import { deleteCompany as removeCompany, updateCompany as saveCompany } from "@/lib/supabase/business-client";
import type { Company, Project } from "@/lib/types";
import { projectStatusLabels } from "@/lib/i18n";
import { isOverdue } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { getProjectMetrics } from "@/lib/project-metrics";
import { CompanyFormDialog } from "./company-form-dialog";
import { TaskRow } from "./task-row";
import { PriorityBadge, StatusBadge } from "./badges";
import { ResourceLinksSection } from "./resource-links-section";
import { normalizeResourceUrl, normalizeWebsiteUrl } from "@/lib/resource-links";
import { CompanyLogo } from "./company-logo";
import { EntityNoteEditor } from "./entity-note-editor";
import { toast } from "./toast";
import { useDialogFocus } from "./use-dialog-focus";
import "./detail-fidelity.css";
import "./company-detail-fidelity.css";

export function CompanyDetailView({ company: initialCompany, projects, linkedTaskCount, loadError = "" }: { company: Company | null; projects: Project[]; linkedTaskCount: number; loadError?: string }) {
  const router = useRouter();
  const { tasks, companies: allCompanies } = useWorkspace();
  const [workspaceTab, setWorkspaceTab] = useState<"projects" | "tasks">("projects");
  const [company, setCompany] = useState(initialCompany);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteLock = useRef(false);
  useDialogFocus(deleteOpen, () => { if (!deleteBusy) setDeleteOpen(false); });
  if (loadError) return <div className="panel p-10 text-center text-rose-700">{loadError}</div>;
  if (!company) return <div className="panel p-10 text-center"><h1 className="text-xl font-semibold">Firma bulunamadı</h1><Link href="/companies" className="text-link mt-3 justify-center">Firmalara dön</Link></div>;

  const companyProjects = projects.filter((project) => project.companyId === company.id);
  const activeProjects = companyProjects.filter((project) => project.status !== "On hold");
  const activeTasks = tasks.filter((task) => task.companyId === company.id && task.status !== "Done" && !task.cancelledAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedTasks = tasks.filter((task) => task.companyId === company.id && task.status === "Done" && !task.cancelledAt);
  const companyWebsiteUrl = normalizeWebsiteUrl(company.website);
  const companyLinkedinUrl = normalizeResourceUrl(company.linkedinUrl);
  const phoneNumber = company.phone.replace(/[^\d+]/g, "");
  const phoneUrl = /^\+?\d+$/.test(phoneNumber) ? `tel:${phoneNumber}` : null;
  const orderedCompanies = [...allCompanies].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const companyIndex = orderedCompanies.findIndex((item) => item.id === company.id);
  const previousCompany = companyIndex > 0 ? orderedCompanies[companyIndex - 1] : null;
  const nextCompany = companyIndex >= 0 && companyIndex < orderedCompanies.length - 1 ? orderedCompanies[companyIndex + 1] : null;
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.show("linkCopied"); } catch { toast.show("copyError"); } };

  return <div className="ofus-reference-detail company-fidelity">
    <div className="ofus-detail-toolbar cf-toolbar"><Link href="/companies" className="cf-back"><ArrowLeft size={17} /><span>Firmalara dön</span></Link><span className="cf-entity-label">FİRMA</span><button type="button" className="icon-button" aria-label="Bağlantıyı kopyala" onClick={copyLink}><Clipboard size={17} /></button></div>
    <header className="cf-hero" data-no-logo={!company.logoUrl || undefined}><div className="cf-entity-actions"><button onClick={() => setEditOpen(true)} className="icon-button" aria-label="Düzenle" title="Düzenle"><Pencil size={16} /></button><button onClick={() => setDeleteOpen(true)} className="icon-button text-rose-600" aria-label="Firma Sil" title="Firma Sil"><Trash2 size={16} /></button></div>{company.logoUrl ? <CompanyLogo path={company.logoUrl} className="cf-logo" /> : null}<p>Şirket profili</p><h1>{company.name}</h1></header>
    <div className="cf-grid"><div className="cf-main"><section className="panel cf-metrics" aria-label="Firma özeti"><div><strong>{activeProjects.length}</strong><span>Aktif proje</span></div><div><strong>{activeTasks.length}</strong><span>Açık görev</span></div><div><strong className="text-rose-500">{activeTasks.filter(isOverdue).length}</strong><span>Geciken görev</span></div></section>
    <section className="panel cf-workspace"><header><h2 className="section-title">Çalışma alanı</h2><div className="cf-tabs" role="tablist" aria-label="Firma çalışma alanı"><button type="button" role="tab" aria-selected={workspaceTab === "projects"} onClick={() => setWorkspaceTab("projects")}>Projeler</button><button type="button" role="tab" aria-selected={workspaceTab === "tasks"} onClick={() => setWorkspaceTab("tasks")}>Görevler</button></div></header>
    {workspaceTab === "projects" ? <div role="tabpanel" aria-label="Firma projeleri">{companyProjects.length ? companyProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}?fromCompany=${encodeURIComponent(company.id)}`} className="cf-project"><div><strong>{project.name}</strong><p>{project.description || "Açıklama eklenmedi."}</p><span className="cf-project-progress">{getProjectMetrics(project.id, tasks).progress}% tamamlandı</span></div><span className="cf-project-status">{projectStatusLabels[project.status]}</span><ExternalLink size={16} /></Link>) : <p className="cf-empty">Bu firmaya bağlı proje yok.</p>}</div> : <div role="tabpanel" aria-label="Firma görevleri">{activeTasks.length ? activeTasks.map((task) => <div key={task.id} className="entity-detail-task-row"><TaskRow task={task} compact /><div className="entity-detail-task-badges"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div></div>) : <p className="cf-empty">Bu firmaya bağlı aktif görev yok.</p>}{completedTasks.length ? <><h3 className="cf-completed-title">Tamamlanan işler · {completedTasks.length}</h3>{completedTasks.map((task) => <div key={task.id} className="entity-detail-task-row"><TaskRow task={task} compact /><div className="entity-detail-task-badges"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div></div>)}</> : null}</div>}</section>
    <section className="panel p-5"><h2 className="section-title">Şirket notları</h2><div className="mt-3"><EntityNoteEditor key={company.id} value={company.notes} label="Kalıcı firma notu" onSave={async (notes) => { const updated = await saveCompany(company.id, { name: company.name, contactName: company.contactName, phone: company.phone, email: company.email, website: company.website, linkedinUrl: company.linkedinUrl, notes }); setCompany(updated); }} /></div></section>
    <ResourceLinksSection ownerType="company" ownerId={company.id} /></div><aside className="cf-contact"><section className="panel p-5"><h2 className="section-title">İletişim</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Yetkili kişi</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-slate-700"><UserRound size={15} className="text-slate-400" />{company.contactName || "Eklenmedi"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Telefon</dt><dd className="mt-1">{company.phone ? phoneUrl ? <a className="flex items-center gap-2 font-semibold text-slate-700 hover:text-indigo-600" href={phoneUrl}><Phone size={15} className="text-slate-400" />{company.phone}</a> : <span className="flex items-center gap-2 font-semibold text-slate-700"><Phone size={15} className="text-slate-400" />{company.phone}</span> : <span className="text-slate-400">Eklenmedi</span>}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">E-posta</dt><dd className="mt-1">{company.email ? <a className="flex items-center gap-2 break-all font-semibold text-slate-700 hover:text-indigo-600" href={`mailto:${company.email}`}><Mail size={15} className="text-slate-400" />{company.email}</a> : <span className="text-slate-400">Eklenmedi</span>}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Web sitesi</dt><dd className="mt-1">{companyWebsiteUrl ? <a className="flex items-center gap-2 break-all font-semibold text-indigo-600 hover:text-indigo-800" href={companyWebsiteUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{company.website}</a> : company.website ? <span className="break-all text-rose-600">Geçersiz web sitesi adresi</span> : <span className="text-slate-400">Eklenmedi</span>}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">LinkedIn</dt><dd className="mt-1">{companyLinkedinUrl ? <a className="flex items-center gap-2 break-all font-semibold text-indigo-600 hover:text-indigo-800" href={companyLinkedinUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{company.linkedinUrl}</a> : company.linkedinUrl ? <span className="break-all text-rose-600">Geçersiz LinkedIn adresi</span> : <span className="text-slate-400">Eklenmedi</span>}</dd></div></dl></section></aside></div>
    <nav className="ofus-detail-nav" aria-label="Firmalar arasında gezinme">{previousCompany ? <Link href={`/companies/${previousCompany.id}`}><ChevronLeft size={18} /><span><small>Önceki firma</small><b>{previousCompany.name}</b></span></Link> : <span />}{nextCompany ? <Link href={`/companies/${nextCompany.id}`}><span><small>Sonraki firma</small><b>{nextCompany.name}</b></span><ChevronRight size={18} /></Link> : <span />}</nav>
    {editOpen ? <CompanyFormDialog company={company} onCancel={() => setEditOpen(false)} onSave={async (input) => { try { setCompany(await saveCompany(company.id, input)); setEditOpen(false); toast.show("recordUpdated", { message: "Firma güncellendi" }); } catch (saveError) { throw saveError instanceof Error ? saveError : new Error("Firma güncellenemedi."); } }} /> : null}
    {deleteOpen ? <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="delete-company-title">
      <button type="button" className="absolute inset-0" onClick={() => { if (!deleteBusy) setDeleteOpen(false); }} aria-label="Silme penceresini kapat" />
      <section className="responsive-dialog-panel max-w-md"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="delete-company-title" className="text-sm font-semibold text-slate-950">Firmayı Sil</h2><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body p-5"><p className="text-sm font-semibold text-slate-800">{company.name} silinsin mi?</p>{companyProjects.length || linkedTaskCount ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Bu firma şu anda silinemez.</p><p className="mt-1 text-xs leading-5 text-amber-700">Firmaya bağlı {companyProjects.length} proje ve {linkedTaskCount} görev var. Önce bu ilişkileri kaldırmanız gerekir.</p></div> : <p className="mt-2 text-xs leading-5 text-slate-500">Firma kaydı kalıcı olarak silinecektir.</p>}{deleteError ? <p className="mt-3 text-xs font-semibold text-rose-600">{deleteError}</p> : null}</div><footer className="responsive-dialog-footer"><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="secondary-button">İptal</button><button disabled={deleteBusy || Boolean(companyProjects.length || linkedTaskCount)} onClick={async () => { if (deleteLock.current) return; deleteLock.current = true; setDeleteBusy(true); try { await removeCompany(company.id); toast.show("recordDeleted", { message: "Firma silindi" }); setDeleteOpen(false); router.push("/companies"); router.refresh(); } catch (error) { setDeleteError(error instanceof Error ? error.message : "Firma silinemedi."); deleteLock.current = false; setDeleteBusy(false); } }} className="primary-button bg-rose-600 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300">{deleteBusy ? "Siliniyor…" : "Firma Sil"}</button></footer></section>
    </div> : null}
  </div>;
}


