"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Mail, Phone, Plus, UserRound } from "lucide-react";
import { createCompany } from "@/lib/supabase/business-client";
import type { Company, Project } from "@/lib/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { CompanyFormDialog } from "./company-form-dialog";
import { CompanyLogo } from "./company-logo";
import { toast } from "./toast";

export function CompaniesView({ companies: initialCompanies, projects, loadError = "" }: { companies: Company[]; projects: Project[]; loadError?: string }) {
  const { tasks } = useWorkspace();
  const [companies, setCompanies] = useState(initialCompanies);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState(loadError);
  return <>
    <PageHeader title="Firmalar" description="Firma, proje ve görev yükünü tek bir görünümde takip edin." actions={<button onClick={() => setAddOpen(true)} className="primary-button"><Plus size={20} />Firma Ekle</button>} />
    <p className="ofus-page-summary">{companies.length} firma</p>
    {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {!companies.length && !error ? <p className="panel p-8 text-center text-sm text-slate-400">Henüz firma eklenmemiş.</p> : null}
    <div className="ofus-company-grid">{companies.map((company) => {
      const activeProjects = projects.filter((project) => project.companyId === company.id && project.status !== "On hold");
      const activeTasks = tasks.filter((task) => task.companyId === company.id && task.status !== "Done" && !task.cancelledAt);
      const overdueTasks = activeTasks.filter(isOverdue);
      const nextDeadline = [...activeTasks].filter((task) => task.dueDate && !isOverdue(task)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      return <Link key={company.id} href={`/companies/${company.id}`} className="panel ofus-company task-card-interactive">
        <div className="ofus-company-logo"><CompanyLogo path={company.logoUrl} className="h-[150px] w-full object-contain" iconSize={58} /></div>
        <div className="ofus-company-body"><h2>{company.name}</h2><p className="mt-1 break-words text-sm text-slate-400">{company.website || "Web sitesi eklenmedi"}</p>
          <p className="mt-6 flex items-center gap-2 text-sm"><UserRound size={16} className="text-slate-400" />{company.contactName || "Yetkili kişi eklenmedi"}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400"><span className="flex items-center gap-2 break-all"><Phone size={14} />{company.phone || "—"}</span><span className="flex items-center gap-2 break-all"><Mail size={14} />{company.email || "—"}</span></div>
          <dl className="ofus-company-stats"><div><dt>Aktif proje</dt><dd>{activeProjects.length}</dd></div><div><dt>Aktif görev</dt><dd>{activeTasks.length}</dd></div><div><dt>Geciken</dt><dd className={overdueTasks.length ? "text-rose-500" : ""}>{overdueTasks.length}</dd></div></dl>
          <p className="text-xs text-slate-400">En yakın son tarih</p><div className="mt-2 flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm"><CalendarDays size={17} className="text-slate-400" />{nextDeadline ? formatDate(nextDeadline.dueDate, true) : "Açık tarih yok"}</span><ArrowUpRight size={24} className="rounded-full bg-indigo-50 p-1 text-indigo-600" /></div>
        </div>
      </Link>;
    })}</div>
    {addOpen ? <CompanyFormDialog onCancel={() => setAddOpen(false)} onSave={async (input) => { try { const company = await createCompany(input); setCompanies((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name, "tr"))); setError(""); setAddOpen(false); toast.show("companyCreated", { message: `“${company.name}” firması oluşturuldu`, actionLabel: "Firmayı aç", href: `/companies/${company.id}` }); } catch (saveError) { throw saveError instanceof Error ? saveError : new Error("Firma kaydedilemedi."); } }} /> : null}
  </>;
}

