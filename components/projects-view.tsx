"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import { createProject } from "@/lib/supabase/business-client";
import { projectStatusLabels } from "@/lib/i18n";
import { getProjectMetrics } from "@/lib/project-metrics";
import type { Company, Project } from "@/lib/types";
import { taskIsOverdue } from "@/lib/task-selectors";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "./page-header";
import { ProjectFormDialog } from "./project-form-dialog";
import { ThemedSelect } from "./themed-select";
import { UserAvatar } from "./user-avatar";
import { useWorkspace } from "./app-provider";
import { toast } from "./toast";

export function ProjectsView({ projects: initialProjects, companies, loadError = "", taskDataAvailable = true }: { projects: Project[]; companies: Company[]; loadError?: string; taskDataAvailable?: boolean }) {
  const { tasks } = useWorkspace();
  const [projects, setProjects] = useState(initialProjects);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState(loadError);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("deadline");
  const deadline = (id: string) => tasks.filter((task) => task.projectId === id && task.status !== "Done" && !task.cancelledAt && task.dueDate).map((task) => task.dueDate).sort()[0] ?? "";
  const filtered = projects.filter((project) => project.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) && (companyFilter === "all" || project.companyId === companyFilter) && (statusFilter === "all" || project.status === statusFilter)).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "tr") : (deadline(a.id) || "9999").localeCompare(deadline(b.id) || "9999"));
  return <>
    <PageHeader title="Projeler" description="İlerlemeyi, açık işleri ve yaklaşan teslimleri tek bakışta görün." actions={<button disabled={!companies.length} onClick={() => setAddOpen(true)} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><Plus size={20} />Proje Ekle</button>} />
    <div className="ofus-page-summary"><span>{projects.length} proje</span><span>{projects.filter((project) => project.status === "Active").length} aktif</span><span>{projects.filter((project) => project.status === "Wrapping up").length} tamamlanıyor</span></div>
    {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {!companies.length && !error ? <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Proje eklemek için önce bir firma ekleyin.</p> : null}
    <div className="panel ofus-filters"><label><span className="sr-only">Projelerde ara</span><input className="input" placeholder="Projelerde ara…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><ThemedSelect ariaLabel="Firma filtresi" value={companyFilter} onValueChange={setCompanyFilter} options={[{ value: "all", label: "Tüm firmalar" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]} /><ThemedSelect ariaLabel="Proje durumu" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: "all", label: "Tüm durumlar" }, ...Object.entries(projectStatusLabels).map(([value, label]) => ({ value, label }))]} /><ThemedSelect ariaLabel="Projeleri sırala" value={sort} onValueChange={setSort} options={[{ value: "deadline", label: "Teslim tarihi" }, { value: "name", label: "Proje adı" }]} /></div>
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filtered.map((project) => {
      const company = companies.find((item) => item.id === project.companyId);
      const projectTasks = tasks.filter((task) => task.projectId === project.id && !task.cancelledAt);
      const done = projectTasks.filter((task) => task.status === "Done").length;
      const overdue = projectTasks.filter((task) => taskIsOverdue(task)).length;
      const { progress, memberIds } = getProjectMetrics(project.id, tasks);
      const dueDate = deadline(project.id);
      return <Link key={project.id} href={`/projects/${project.id}`} className="panel project-card task-card-interactive">
        <div className="flex items-center justify-between gap-3"><p className="flex min-w-0 items-center gap-2 text-sm text-slate-500"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: company?.color ?? "var(--brand)" }} /><span className="truncate">{company?.name ?? "Firma yok"}</span></p><span className={`badge shrink-0 ${project.status === "Active" ? "bg-emerald-50" : project.status === "On hold" ? "bg-amber-50" : "bg-blue-50"}`}>{projectStatusLabels[project.status]}</span></div>
        <h2 className="mt-5 break-words font-bold leading-tight">{project.name}</h2><p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">{project.description || "Açıklama eklenmedi."}</p>
        {taskDataAvailable ? <><div className="mt-5 flex justify-between gap-3 text-sm"><span className="text-slate-400">Tamamlanan görevler</span><span className="font-medium">{done} / {projectTasks.length}</span></div><div className="ofus-progress" role="progressbar" aria-label="Proje ilerlemesi" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{projectTasks.length - done} açık görev</span>{overdue ? <span className="badge bg-rose-50">{overdue} geciken görev</span> : null}</div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4"><div><p className="text-xs text-slate-400">Son teslim</p><p className="mt-2 flex items-center gap-2 text-sm"><CalendarDays size={16} />{dueDate ? formatDate(dueDate, true) : "Tarih belirlenmedi"}</p></div><div><p className="text-xs text-slate-400">Sorumlu</p><div className="mt-2 flex flex-wrap gap-2">{memberIds.length ? memberIds.map((id) => <UserAvatar key={id} userId={id} size="sm" />) : <span className="text-sm text-slate-400">Henüz atanmadı</span>}</div></div></div>
        </> : <p className="my-8 text-sm text-amber-700" role="status">Görev bilgileri şu anda yüklenemiyor.</p>}
        <div className="mt-4 flex justify-between font-medium text-indigo-600"><span>Projeyi aç</span><ArrowUpRight size={24} className="rounded-full bg-indigo-50 p-1" /></div>
      </Link>;
    })}</div>
    {!filtered.length && !error ? <div className="panel p-8 text-center text-sm text-slate-400">{projects.length ? "Filtrelerle eşleşen proje yok." : "Henüz proje eklenmemiş."}</div> : null}
    <p className="mt-5 text-sm text-slate-400">{filtered.length} proje gösteriliyor</p>
    {addOpen ? <ProjectFormDialog companies={companies} onCancel={() => setAddOpen(false)} onSave={async (input) => { try { const project = await createProject(input); setProjects((current) => [...current, project].sort((a, b) => a.name.localeCompare(b.name, "tr"))); setError(""); setAddOpen(false); toast.show("projectCreated", { message: `“${project.name}” projesi oluşturuldu`, actionLabel: "Projeyi aç", href: `/projects/${project.id}` }); } catch { throw new Error("Proje kaydedilemedi."); } }} /> : null}
  </>;
}


