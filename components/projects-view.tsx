"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { createProject } from "@/lib/supabase/business-client";
import { projectStatusLabels } from "@/lib/i18n";
import type { Company, Project } from "@/lib/types";
import { PageHeader } from "./page-header";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectsView({ projects: initialProjects, companies, loadError = "" }: { projects: Project[]; companies: Company[]; loadError?: string }) {
  const [projects, setProjects] = useState(initialProjects);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState(loadError);
  return <>
    <PageHeader eyebrow="Firma işleri" title="Projeler" description="Tüm aktif işlerde teslimat durumunu tek bakışta görün." actions={<button disabled={!companies.length} onClick={() => setAddOpen(true)} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><Plus size={15} />Proje Ekle</button>} />
    {error ? <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {!companies.length && !error ? <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">Proje eklemek için önce bir firma ekleyin.</p> : null}
    {!projects.length && !error ? <div className="panel p-8 text-center text-sm text-slate-400">Henüz proje eklenmemiş.</div> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => {
      const company = companies.find((item) => item.id === project.companyId);
      if (!company) return null;
      return <Link key={project.id} href={`/projects/${project.id}`} className="panel group block p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-950/[0.04]">
        <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="h-9 w-1 rounded-full" style={{ backgroundColor: company.color }} /><div><p className="text-xs font-semibold text-slate-400">{company.name}</p><h2 className="mt-0.5 text-base font-semibold text-slate-900">{project.name}</h2></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${project.status === "Active" ? "bg-emerald-50 text-emerald-700" : project.status === "On hold" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{projectStatusLabels[project.status]}</span></div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{project.description || "Açıklama eklenmedi."}</p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400"><span>Firma projesi</span><ArrowRight size={16} className="transition group-hover:translate-x-0.5 group-hover:text-indigo-600" /></div>
      </Link>;
    })}</div>
    {addOpen ? <ProjectFormDialog companies={companies} onCancel={() => setAddOpen(false)} onSave={async (input) => { try { const project = await createProject(input); setProjects((current) => [...current, project].sort((a, b) => a.name.localeCompare(b.name, "tr"))); setError(""); setAddOpen(false); } catch { throw new Error("Proje kaydedilemedi."); } }} /> : null}
  </>;
}
