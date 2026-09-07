"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, CalendarDays, CircleAlert, Mail, Phone, Plus } from "lucide-react";
import { createCompany } from "@/lib/supabase/business-client";
import type { Company, Project } from "@/lib/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { CompanyFormDialog } from "./company-form-dialog";

export function CompaniesView({ companies: initialCompanies, projects, loadError = "" }: { companies: Company[]; projects: Project[]; loadError?: string }) {
  const { tasks } = useWorkspace();
  const [companies, setCompanies] = useState(initialCompanies);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState(loadError);

  return <>
    <PageHeader eyebrow="İş kaynakları" title="Firmalar" description="Firma, proje ve görev yükünü tek bir görünümde takip edin." actions={<button onClick={() => setAddOpen(true)} className="primary-button"><Plus size={15} />Firma Ekle</button>} />
    {error ? <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    <section className="panel overflow-hidden">
      <div className="hidden grid-cols-[minmax(210px,1.4fr)_minmax(180px,1fr)_110px_110px_150px_90px_30px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 xl:grid">
        <span>Firma</span><span>İletişim</span><span>Aktif proje</span><span>Aktif görev</span><span>En yakın son tarih</span><span>Geciken</span><span />
      </div>
      {!companies.length && !error ? <p className="p-8 text-center text-sm text-slate-400">Henüz firma eklenmemiş.</p> : null}
      <div className="divide-y divide-slate-100">{companies.map((company) => {
        const activeProjects = projects.filter((project) => project.companyId === company.id && project.status !== "On hold");
        const activeTasks = tasks.filter((task) => task.companyId === company.id && task.status !== "Done" && !task.cancelledAt);
        const overdueTasks = activeTasks.filter(isOverdue);
        const nextDeadline = [...activeTasks].filter((task) => !isOverdue(task)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
        return <Link key={company.id} href={`/companies/${company.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:grid-cols-2 sm:items-center sm:px-5 xl:grid-cols-[minmax(210px,1.4fr)_minmax(180px,1fr)_110px_110px_150px_90px_30px]">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: company.color }}><Building2 size={18} /></span><div><h2 className="text-sm font-semibold text-slate-900">{company.name}</h2><p className="mt-0.5 text-xs text-slate-400">{company.website || "Web sitesi eklenmedi"}</p></div></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">Yetkili kişi</p><p className="mt-1 text-xs font-semibold text-slate-700 xl:mt-0">{company.contactName || "Yetkili kişi eklenmedi"}</p><p className="mt-1 hidden items-center gap-1.5 text-[11px] text-slate-400 xl:flex"><Phone size={11} />{company.phone || "—"}</p><p className="mt-1 hidden items-center gap-1.5 text-[11px] text-slate-400 xl:flex"><Mail size={11} />{company.email || "—"}</p></div>
          <div className="hidden xl:block"><p className="text-sm font-bold text-slate-800">{activeProjects.length}</p></div>
          <div className="hidden xl:block"><p className="text-sm font-bold text-slate-800">{activeTasks.length}</p></div>
          <div className="hidden xl:block"><p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><CalendarDays size={13} className="text-slate-400" />{nextDeadline ? formatDate(nextDeadline.dueDate, true) : "Açık tarih yok"}</p></div>
          <div className="hidden xl:block"><p className={`flex items-center gap-1 text-sm font-bold ${overdueTasks.length ? "text-rose-600" : "text-slate-700"}`}>{overdueTasks.length ? <CircleAlert size={14} /> : null}{overdueTasks.length}</p></div>
          <ArrowRight size={16} className="hidden text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 xl:block" />
        </Link>;
      })}</div>
    </section>
    {addOpen ? <CompanyFormDialog onCancel={() => setAddOpen(false)} onSave={async (input) => { try { const company = await createCompany(input); setCompanies((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name, "tr"))); setError(""); setAddOpen(false); } catch { throw new Error("Firma kaydedilemedi."); } }} /> : null}
  </>;
}
