"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clipboard, Pencil, Trash2, X } from "lucide-react";
import { deleteProject as removeProject, updateProject as saveProject } from "@/lib/supabase/business-client";
import { projectStatusLabels } from "@/lib/i18n";
import type { Company, Project } from "@/lib/types";
import { useWorkspace } from "./app-provider";
import { ProjectFormDialog } from "./project-form-dialog";
import { TaskRow } from "./task-row";
import { PriorityBadge, StatusBadge } from "./badges";
import { ResourceLinksSection } from "./resource-links-section";
import { EntityNoteEditor } from "./entity-note-editor";
import { toast } from "./toast";
import { formatDate } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";
import { useDialogFocus } from "./use-dialog-focus";
import "./detail-fidelity.css";
import "./project-detail-fidelity.css";

export function ProjectDetailView({ project: initialProject, company: initialCompany, companies, linkedTaskCount, loadError = "" }: { project: Project | null; company: Company | null; companies: Company[]; linkedTaskCount: number; loadError?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, projects: allProjects } = useWorkspace();
  const [project, setProject] = useState(initialProject);
  const [company, setCompany] = useState(initialCompany);
  const [taskTab, setTaskTab] = useState<"active" | "completed">("active");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteLock = useRef(false);
  useDialogFocus(deleteOpen, () => { if (!deleteBusy) setDeleteOpen(false); });
  if (loadError) return <div className="panel p-10 text-center text-rose-700">{loadError}</div>;
  if (!project || !company) return <div className="panel p-10 text-center"><h1 className="text-xl font-semibold">Proje bulunamadı</h1><Link href="/projects" className="text-link mt-3 justify-center">Projelere dön</Link></div>;

  const active = tasks.filter((task) => task.projectId === project.id && task.status !== "Done" && !task.cancelledAt);
  const complete = tasks.filter((task) => task.projectId === project.id && task.status === "Done" && !task.cancelledAt);
  const totalTasks = active.length + complete.length;
  const progress = totalTasks ? Math.round(complete.length / totalTasks * 100) : 0;
  const visibleTasks = taskTab === "active" ? active : complete;
  const requestedCompanyId = searchParams.get("fromCompany");
  const fromCompanyId = requestedCompanyId === project.companyId && companies.some((item) => item.id === requestedCompanyId) ? requestedCompanyId : null;
  const projectListHref = fromCompanyId ? `/companies/${fromCompanyId}` : "/projects";
  const projectHref = (id: string) => fromCompanyId ? `/projects/${id}?fromCompany=${encodeURIComponent(fromCompanyId)}` : `/projects/${id}`;
  const orderedProjects = [...allProjects].filter((item) => !fromCompanyId || item.companyId === fromCompanyId).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const projectIndex = orderedProjects.findIndex((item) => item.id === project.id);
  const previousProject = projectIndex > 0 ? orderedProjects[projectIndex - 1] : null;
  const nextProject = projectIndex >= 0 && projectIndex < orderedProjects.length - 1 ? orderedProjects[projectIndex + 1] : null;
  const latestDeadline = active.map((task) => task.dueDate).filter(Boolean).sort().at(-1) ?? null;
  const assigneeIds = [...new Set(active.map((task) => task.assigneeId).filter(Boolean))];
  const statusClass = project.status === "Active" ? "is-active" : project.status === "Wrapping up" ? "is-wrapping" : "is-waiting";
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.show("linkCopied"); } catch { toast.show("copyError"); } };

  return <div className="ofus-reference-detail ofus-project-detail">
    <div className="ofus-detail-toolbar pd-toolbar"><Link href={projectListHref} className="flex items-center gap-3 text-sm text-slate-500"><ArrowLeft size={17} />{fromCompanyId ? "Firmaya dön" : "Projelere dön"}</Link><span className="ml-auto text-xs text-slate-500">PROJE</span><button type="button" className="icon-button" aria-label="Bağlantıyı kopyala" onClick={copyLink}><Clipboard size={17} /></button></div>

    <header className="pd-heading">
      <div className="pd-heading-copy"><Link href={`/companies/${company.id}`} style={{ color: company.color }}>{company.name}</Link><h1>{project.name}</h1></div>
      <div className="pd-heading-actions"><span className={`pd-status ${statusClass}`}>{projectStatusLabels[project.status]}</span><button type="button" onClick={() => setEditOpen(true)} className="secondary-button"><Pencil size={14} />Düzenle</button><button type="button" onClick={() => setDeleteOpen(true)} className="icon-button pd-delete" aria-label="Projeyi sil"><Trash2 size={15} /></button></div>
    </header>

    <div className="pd-grid">
      <main className="pd-main">
        <section className="panel pd-card pd-summary"><h2>Proje özeti</h2><p>{project.description || "Bu proje için açıklama eklenmedi."}</p></section>

        <section className="panel pd-card pd-tasks">
          <h2>Proje görevleri</h2>
          <div className="pd-task-filters" role="group" aria-label="Proje görevlerini filtrele">
            <button type="button" className={taskTab === "active" ? "is-selected" : ""} aria-pressed={taskTab === "active"} onClick={() => setTaskTab("active")}>Açık görevler <span>{active.length}</span></button>
            <button type="button" className={taskTab === "completed" ? "is-selected" : ""} aria-pressed={taskTab === "completed"} onClick={() => setTaskTab("completed")}>Tamamlananlar <span>{complete.length}</span></button>
          </div>
          <div className="pd-task-list">{visibleTasks.length ? visibleTasks.map((task) => <div key={task.id} className="entity-detail-task-row"><TaskRow task={task} compact /><div className="entity-detail-task-badges"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div></div>) : <p className="pd-empty">{taskTab === "active" ? "Henüz açık görev yok." : "Henüz tamamlanan görev yok."}</p>}</div>
        </section>

        <section className="panel pd-card pd-notes"><h2>Proje notları</h2><EntityNoteEditor key={project.id} value={project.notes} label="Kalıcı proje notu" onSave={async (notes) => { const updated = await saveProject(project.id, { name: project.name, companyId: project.companyId, status: project.status, description: project.description, notes }); setProject(updated); }} /></section>
      </main>

      <aside className="pd-properties">
        <section className="panel pd-card pd-progress-card"><h2>Proje ilerlemesi</h2><strong>{complete.length} / {totalTasks}</strong><div className="ofus-progress" role="progressbar" aria-label="Proje ilerlemesi" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p>Tamamlanan görevler</p></section>
        <section className="panel pd-card pd-info-card"><h2>Proje bilgileri</h2><dl><div><dt>Firma</dt><dd><Link href={`/companies/${company.id}`}><i style={{ backgroundColor: company.color }} />{company.name}</Link></dd></div><div><dt>Son teslim</dt><dd><CalendarDays size={15} />{latestDeadline ? formatDate(latestDeadline) : "Görev tarihi yok"}</dd></div><div><dt>Sorumlular</dt><dd className="pd-members">{assigneeIds.length ? assigneeIds.map((id) => <UserAvatar key={id} userId={id} size="sm" showName />) : <span>Henüz atanmadı</span>}</dd></div></dl></section>
      </aside>
    </div>

    <div className="pd-resources"><ResourceLinksSection ownerType="project" ownerId={project.id} /></div>
    <nav className="ofus-detail-nav" aria-label="Projeler arasında gezinme">{previousProject ? <Link href={projectHref(previousProject.id)}><ChevronLeft size={18} /><span><small>Önceki proje</small><b>{previousProject.name}</b></span></Link> : <span />}{nextProject ? <Link href={projectHref(nextProject.id)}><span><small>Sonraki proje</small><b>{nextProject.name}</b></span><ChevronRight size={18} /></Link> : <span />}</nav>

    {editOpen ? <ProjectFormDialog project={project} companies={companies} onCancel={() => setEditOpen(false)} onSave={async (input) => { try { const updated = await saveProject(project.id, input); setProject(updated); setCompany(companies.find((item) => item.id === updated.companyId) ?? company); setEditOpen(false); toast.show("recordUpdated", { message: "Proje güncellendi" }); } catch { throw new Error("Proje güncellenemedi."); } }} /> : null}
    {deleteOpen ? <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="delete-project-title"><button type="button" className="absolute inset-0" onClick={() => { if (!deleteBusy) setDeleteOpen(false); }} aria-label="Silme penceresini kapat" /><section className="responsive-dialog-panel max-w-md"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="delete-project-title" className="text-sm font-semibold text-slate-950">Projeyi Sil</h2><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body p-5"><p className="text-sm font-semibold text-slate-800">{project.name} silinsin mi?</p>{linkedTaskCount ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Bu proje şu anda silinemez.</p><p className="mt-1 text-xs text-amber-700">Projeye bağlı {linkedTaskCount} görev var.</p></div> : <p className="mt-2 text-xs text-slate-500">Proje kaydı kalıcı olarak silinecektir.</p>}{deleteError ? <p className="mt-3 text-xs font-semibold text-rose-600">{deleteError}</p> : null}</div><footer className="responsive-dialog-footer"><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)} className="secondary-button">İptal</button><button disabled={deleteBusy || Boolean(linkedTaskCount)} onClick={async () => { if (deleteLock.current) return; deleteLock.current = true; setDeleteBusy(true); try { await removeProject(project.id); toast.show("recordDeleted", { message: "Proje silindi" }); router.push("/projects"); router.refresh(); } catch (error) { setDeleteError(error instanceof Error ? error.message : "Proje silinemedi."); deleteLock.current = false; setDeleteBusy(false); } }} className="primary-button bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300">{deleteBusy ? "Siliniyor…" : "Proje Sil"}</button></footer></section></div> : null}
  </div>;
}
