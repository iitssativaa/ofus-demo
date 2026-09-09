"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clipboard, ClipboardList, Pencil, Trash2, X } from "lucide-react";
import { deleteProject as removeProject, updateProject as saveProject } from "@/lib/supabase/business-client";
import { projectStatusLabels } from "@/lib/i18n";
import type { Company, Project } from "@/lib/types";
import { useWorkspace } from "./app-provider";
import { ProjectFormDialog } from "./project-form-dialog";
import { TaskRow } from "./task-row";
import { ResourceLinksSection } from "./resource-links-section";
import { EntityNoteEditor } from "./entity-note-editor";
import { toast } from "./toast";

export function ProjectDetailView({ project: initialProject, company: initialCompany, companies, linkedTaskCount, loadError = "" }: { project: Project | null; company: Company | null; companies: Company[]; linkedTaskCount: number; loadError?: string }) {
  const router = useRouter();
  const { tasks, projects: allProjects } = useWorkspace();
  const [project, setProject] = useState(initialProject);
  const [company, setCompany] = useState(initialCompany);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteLock = useRef(false);
  if (loadError) return <div className="panel p-10 text-center text-rose-700">{loadError}</div>;
  if (!project || !company) return <div className="panel p-10 text-center"><h1 className="text-xl font-semibold">Proje bulunamadı</h1><Link href="/projects" className="text-link mt-3 justify-center">Projelere dön</Link></div>;
  const active = tasks.filter((task) => task.projectId === project.id && task.status !== "Done" && !task.cancelledAt);
  const complete = tasks.filter((task) => task.projectId === project.id && task.status === "Done" && !task.cancelledAt);
  const progress = active.length + complete.length ? Math.round(complete.length / (active.length + complete.length) * 100) : 0;
  const orderedProjects = [...allProjects].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const projectIndex = orderedProjects.findIndex((item) => item.id === project.id);
  const previousProject = projectIndex > 0 ? orderedProjects[projectIndex - 1] : null;
  const nextProject = projectIndex >= 0 && projectIndex < orderedProjects.length - 1 ? orderedProjects[projectIndex + 1] : null;
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.show("linkCopied"); } catch { toast.show("copyError"); } };
  return <>
    <div className="ofus-detail-toolbar mb-5 rounded-xl"><div className="ofus-detail-toolbar-group"><Link href="/projects" className="icon-button" aria-label="Projelere dön"><ArrowLeft size={17} /></Link><span className="ofus-detail-id">Proje · {project.id.slice(0, 8)}</span></div><button type="button" className="secondary-button" onClick={copyLink}><Clipboard size={15} />Bağlantıyı kopyala</button></div>
    <div className="mb-6"><ResourceLinksSection ownerType="project" ownerId={project.id} /></div>
    <header className="panel ofus-detail-panel overflow-hidden"><div className="h-1.5" style={{ backgroundColor: company.color }} /><div className="p-5 sm:p-8"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><Link href={`/companies/${company.id}`} className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: company.color }}>{company.name}</Link><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{project.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{project.description || "Bu proje için açıklama eklenmedi."}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{projectStatusLabels[project.status]}</span><button onClick={() => setEditOpen(true)} className="secondary-button"><Pencil size={14} />Düzenle</button><button onClick={() => setDeleteOpen(true)} className="secondary-button text-rose-600"><Trash2 size={14} />Sil</button></div></div><div className="ofus-detail-progress mt-7"><strong>{progress}%</strong><div className="ofus-progress" role="progressbar" aria-label="Proje ilerlemesi" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p className="text-right text-sm font-semibold text-slate-700">{active.length} açık<br /><span className="text-slate-400">{complete.length} tamamlandı</span></p></div></div></header>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]"><div className="space-y-6"><section className="panel overflow-hidden"><div className="panel-header"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-indigo-600" /><h2 className="section-title">İlgili görevler</h2></div><span className="text-xs font-semibold text-slate-400">{active.length} aktif</span></div>{active.length ? active.map((task) => <TaskRow key={task.id} task={task} compact />) : <p className="p-6 text-sm text-slate-400">Henüz aktif görev yok.</p>}</section><section className="panel overflow-hidden"><div className="panel-header"><div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-600" /><h2 className="section-title">Tamamlananlar</h2></div></div>{complete.length ? complete.map((task) => <TaskRow key={task.id} task={task} compact />) : <p className="p-6 text-sm text-slate-400">Henüz tamamlanan görev yok.</p>}</section></div><aside className="panel h-fit p-5"><h2 className="section-title">Proje notları</h2><div className="mt-3"><EntityNoteEditor key={project.id} value={project.notes} label="Kalıcı proje notu" onSave={async (notes) => { const updated = await saveProject(project.id, { name: project.name, companyId: project.companyId, status: project.status, description: project.description, notes }); setProject(updated); }} /></div></aside></div>
    <nav className="ofus-detail-nav" aria-label="Projeler arasında gezinme">{previousProject ? <Link href={`/projects/${previousProject.id}`}><ChevronLeft size={18} /><span><small>Önceki proje</small><b>{previousProject.name}</b></span></Link> : <span />}{nextProject ? <Link href={`/projects/${nextProject.id}`}><span><small>Sonraki proje</small><b>{nextProject.name}</b></span><ChevronRight size={18} /></Link> : <span />}</nav>
    {editOpen ? <ProjectFormDialog project={project} companies={companies} onCancel={() => setEditOpen(false)} onSave={async (input) => { try { const updated = await saveProject(project.id, input); setProject(updated); setCompany(companies.find((item) => item.id === updated.companyId) ?? company); setEditOpen(false); toast.show("recordUpdated", { message: "Proje güncellendi" }); } catch { throw new Error("Proje güncellenemedi."); } }} /> : null}
    {deleteOpen ? <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="delete-project-title"><button type="button" className="absolute inset-0" onClick={() => { if (!deleteBusy) setDeleteOpen(false); }} aria-label="Silme penceresini kapat" /><section className="responsive-dialog-panel max-w-md"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="delete-project-title" className="text-sm font-semibold text-slate-950">Projeyi Sil</h2><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body p-5"><p className="text-sm font-semibold text-slate-800">{project.name} silinsin mi?</p>{linkedTaskCount ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Bu proje şu anda silinemez.</p><p className="mt-1 text-xs text-amber-700">Projeye bağlı {linkedTaskCount} görev var.</p></div> : <p className="mt-2 text-xs text-slate-500">Proje kaydı kalıcı olarak silinecektir.</p>}{deleteError ? <p className="mt-3 text-xs font-semibold text-rose-600">{deleteError}</p> : null}</div><footer className="responsive-dialog-footer"><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="secondary-button">İptal</button><button disabled={deleteBusy || Boolean(linkedTaskCount)} onClick={async () => { if (deleteLock.current) return; deleteLock.current = true; setDeleteBusy(true); try { await removeProject(project.id); toast.show("recordDeleted", { message: "Proje silindi" }); router.push("/projects"); router.refresh(); } catch (error) { setDeleteError(error instanceof Error ? error.message : "Proje silinemedi."); deleteLock.current = false; setDeleteBusy(false); } }} className="primary-button bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300">{deleteBusy ? "Siliniyor…" : "Proje Sil"}</button></footer></section></div> : null}
  </>;
}


