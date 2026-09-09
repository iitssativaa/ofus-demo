"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Columns3, History, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { priorityLabels, statusLabels } from "@/lib/i18n";
import { dashboardSummary, taskIsOverdue, taskDate, localDate } from "@/lib/task-selectors";
import type { Priority, Status, Task } from "@/lib/types";
import { companyFor, formatDate } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PageHeader } from "./page-header";
import { TaskCard, TaskRow } from "./task-row";
import { ThemedSelect } from "./themed-select";
import { Checkbox } from "./checkbox";
import { BulkTaskActions } from "./bulk-task-actions";

const activeStatuses: Status[] = ["To Do", "In Progress", "Waiting", "Review"];
const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
const priorityRank: Record<Priority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const isCancelled = (task: Task) => Boolean(task.cancelledAt && task.deletionReason);
const isFormallyCompleted = (task: Task) => !isCancelled(task) && task.status === "Done";

function CompletedRow({ task }: { task: Task }) {
  const { companies, projects, users, setSelectedTask } = useWorkspace();
  const completedChecks = task.completionChecklist ? Object.values(task.completionChecklist).filter(Boolean).length : 0;
  const project = projects.find((item) => item.id === task.projectId);
  const user = users.find((item) => item.id === task.assigneeId);
  return <button onClick={() => setSelectedTask(task)} className="completed-task-row grid w-full grid-cols-[minmax(210px,1.5fr)_minmax(140px,1fr)_minmax(150px,1fr)_100px_110px_120px_64px] items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0">
    <span className="truncate text-sm font-semibold text-slate-800">{task.title}</span><span className="truncate text-xs text-slate-500">{companyFor(task.companyId, companies).name}</span><span className="truncate text-xs text-slate-500">{project?.name ?? "—"}</span><span className="text-xs font-medium text-slate-600">{user?.firstName ?? "—"}</span><span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-100 px-2.5 text-[10px] font-extrabold tracking-[0.08em] text-emerald-800 shadow-sm shadow-emerald-900/5"><CheckCircle2 size={12} />TAMAMLANDI</span><span className="text-xs font-semibold text-slate-500">{task.completedAt ? formatDate(task.completedAt) : "—"}</span><span className="text-xs font-bold text-emerald-700">{completedChecks}/4</span>
  </button>;
}

function CancelledRow({ task }: { task: Task }) {
  const { companies, projects, users, setSelectedTask } = useWorkspace();
  const project = projects.find((item) => item.id === task.projectId);
  const user = users.find((item) => item.id === task.assigneeId);
  return <button onClick={() => setSelectedTask(task)} className="cancelled-task-row grid w-full grid-cols-[minmax(210px,1.5fr)_minmax(140px,1fr)_minmax(150px,1fr)_100px_110px_120px_minmax(180px,1.2fr)] items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0">
    <span className="truncate text-sm font-semibold text-slate-700">{task.title}</span><span className="truncate text-xs text-slate-500">{companyFor(task.companyId, companies).name}</span><span className="truncate text-xs text-slate-500">{project?.name ?? "—"}</span><span className="text-xs font-medium text-slate-600">{user?.firstName ?? "—"}</span><span className="inline-flex h-7 w-fit items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-extrabold tracking-[0.06em] text-rose-700">İPTAL EDİLDİ</span><span className="text-xs font-semibold text-slate-500">{task.cancelledAt ? formatDate(task.cancelledAt) : "—"}</span><span className="truncate text-xs text-slate-600">{task.deletionReason}</span>
  </button>;
}

function MobileArchiveCard({ task, completed }: { task: Task; completed: boolean }) {
  const { companies, projects, users, setSelectedTask } = useWorkspace();
  const project = projects.find((item) => item.id === task.projectId);
  const user = users.find((item) => item.id === task.assigneeId);
  return <button onClick={() => setSelectedTask(task)} className={`${completed ? "completed-task-row" : "cancelled-task-row"} w-full border-b border-slate-100 p-4 text-left last:border-0`}>
    <span className="block text-sm font-semibold text-slate-800">{task.title}</span>
    <span className="mt-1 block truncate text-xs text-slate-500">{companyFor(task.companyId, companies).name} · {project?.name ?? "—"}</span>
    <span className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span>{user?.firstName ?? "—"}</span><span>·</span><span>{completed ? `Tamamlandı: ${task.completedAt ? formatDate(task.completedAt) : "—"}` : `İptal: ${task.cancelledAt ? formatDate(task.cancelledAt) : "—"}`}</span>{!completed && task.deletionReason ? <span className="basis-full text-rose-600">{task.deletionReason}</span> : null}</span>
  </button>;
}

export function TasksView({ loadError = "" }: { loadError?: string }) {
  const { tasks, companies, projects, users, taskError, taskSaving, clearTaskError, setQuickAddOpen, bulkUpdateTasks } = useWorkspace();
  const [section, setSection] = useState<"active" | "completed" | "cancelled">("active");
  const [view, setView] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.toLowerCase());
  const [assignee, setAssignee] = useState("all");
  const [project, setProject] = useState("all");
  const [company, setCompany] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [archiveFrom, setArchiveFrom] = useState("");
  const [archiveTo, setArchiveTo] = useState("");
  const [sort, setSort] = useState("due");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [bulkMessage, setBulkMessage] = useState<{ text: string; error: boolean } | null>(null);
  const commonFilterCount = [assignee, project, company].filter((value) => value !== "all").length;
  const filterCount = commonFilterCount + (section === "active"
    ? Number(status !== "all") + Number(priority !== "all")
    : Number(section === "completed" && priority !== "all") + Number(Boolean(archiveFrom)) + Number(Boolean(archiveTo)));
  const hasFilters = Boolean(search) || filterCount > 0;
  const clear = () => { setSearch(""); setAssignee("all"); setProject("all"); setCompany("all"); setStatus("all"); setPriority("all"); setArchiveFrom(""); setArchiveTo(""); };
  useEffect(() => {
    if (!filtersOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [filtersOpen]);
  const filtered = useMemo(() => tasks.filter((task) => {
    const inSection = section === "active" ? activeStatuses.includes(task.status) && !isCancelled(task) : section === "completed" ? isFormallyCompleted(task) : isCancelled(task);
    const haystack = `${task.title} ${task.description} ${task.tags.join(" ")} ${task.resultNote ?? ""} ${task.deletionReason ?? ""} ${task.deletionNote ?? ""}`.toLowerCase();
    const archiveDate = section === "completed" ? task.completedAt : task.cancelledAt;
    return inSection && (!deferredSearch || haystack.includes(deferredSearch)) && (assignee === "all" || task.assigneeId === assignee) && (project === "all" || task.projectId === project) && (company === "all" || task.companyId === company) && (section !== "active" || status === "all" || task.status === status) && (section === "cancelled" || priority === "all" || task.priority === priority) && (section === "active" || ((!archiveFrom || Boolean(archiveDate && archiveDate >= archiveFrom)) && (!archiveTo || Boolean(archiveDate && archiveDate <= archiveTo))));
  }).sort((a, b) => {
    if (section === "completed") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    if (section === "cancelled") return (b.cancelledAt ?? "").localeCompare(a.cancelledAt ?? "");
    if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.dueDate.localeCompare(b.dueDate);
  }), [tasks, section, deferredSearch, assignee, project, company, status, priority, archiveFrom, archiveTo, sort]);
  const selectionKey = [section, search, assignee, project, company, status, priority, archiveFrom, archiveTo].join("|");
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<string>();
  const visibleIds = filtered.map((task) => task.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const setSelected = (id: string, checked: boolean) => {
    setBulkMessage(null);
    setSelection((current) => {
      const next = new Set(current.key === selectionKey ? current.ids : []);
      if (checked) next.add(id); else next.delete(id);
      return { key: selectionKey, ids: next };
    });
  };
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });
  const toggleAllVisible = (checked: boolean) => {
    setBulkMessage(null);
    setSelection({ key: selectionKey, ids: new Set(checked ? visibleIds : []) });
  };

  const filterControls = (mobile = false) => <div className={mobile ? "grid gap-3" : "task-filter-fields"}>
    {!mobile ? <span className="hidden text-slate-400 xl:block"><SlidersHorizontal size={16} /></span> : null}
    <ThemedSelect className={mobile ? "input mt-0" : "filter-select"} ariaLabel="Sorumluya göre filtrele" value={assignee} onValueChange={setAssignee} options={[{ value: "all", label: "Tüm kişiler" }, ...users.map((item) => ({ value: item.id, label: item.firstName }))]} />
    <ThemedSelect className={mobile ? "input mt-0" : "filter-select"} ariaLabel="Projeye göre filtrele" value={project} onValueChange={setProject} options={[{ value: "all", label: "Tüm projeler" }, ...projects.map((item) => ({ value: item.id, label: item.name }))]} />
    <ThemedSelect className={mobile ? "input mt-0" : "filter-select"} ariaLabel="Firmaya göre filtrele" value={company} onValueChange={setCompany} options={[{ value: "all", label: "Tüm firmalar" }, ...companies.map((item) => ({ value: item.id, label: item.name }))]} />
    {section === "active" ? <ThemedSelect className={mobile ? "input mt-0" : "filter-select"} ariaLabel="Duruma göre filtrele" value={status} onValueChange={setStatus} options={[{ value: "all", label: "Tüm durumlar" }, ...activeStatuses.map((item) => ({ value: item, label: statusLabels[item] }))]} /> : null}
    {section !== "cancelled" ? <ThemedSelect className={mobile ? "input mt-0" : "filter-select"} ariaLabel="Önceliğe göre filtrele" value={priority} onValueChange={setPriority} options={[{ value: "all", label: "Tüm öncelikler" }, ...priorities.map((item) => ({ value: item, label: priorityLabels[item] }))]} /> : null}
    {section !== "active" ? <div className={mobile ? "grid grid-cols-2 gap-3" : "contents"}><label className="text-[11px] font-semibold text-slate-400">Başlangıç<input type="date" lang="tr" className={mobile ? "input" : "filter-select ml-1"} value={archiveFrom} onChange={(event) => setArchiveFrom(event.target.value)} aria-label={`${section === "completed" ? "Tamamlanma" : "İptal"} tarihi başlangıcı`} /></label><label className="text-[11px] font-semibold text-slate-400">Bitiş<input type="date" lang="tr" className={mobile ? "input" : "filter-select ml-1"} value={archiveTo} onChange={(event) => setArchiveTo(event.target.value)} aria-label={`${section === "completed" ? "Tamamlanma" : "İptal"} tarihi bitişi`} /></label></div> : null}
    {!mobile && hasFilters ? <button onClick={clear} className="secondary-button h-9 px-2.5"><X size={14} />Filtreleri Temizle</button> : null}
  </div>;

  return <>
    <PageHeader eyebrow="İş kuyruğu" title="Görevler" description="İşleri önceliklendir, sorumluları gör ve ilerlemeyi takip et." actions={<button onClick={() => setQuickAddOpen(true)} className="primary-button"><Plus size={15} />Görev Ekle</button>} />
    <div className="ofus-page-summary"><span>{dashboardSummary(tasks).active.length} aktif görev</span><span>{dashboardSummary(tasks).overdue.length} geciken</span><span>{dashboardSummary(tasks).dueToday.length} bugün</span></div>
    {loadError || taskError ? <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"><span>{loadError || taskError}</span>{taskError ? <button onClick={clearTaskError} className="text-xs font-bold">Kapat</button> : null}</div> : null}
    {bulkMessage ? <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${bulkMessage.error ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{bulkMessage.text}</div> : null}
    <section className="panel ofus-task-surface overflow-hidden">
    <div className="task-sections mb-4 grid w-full grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto"><button onClick={() => setSection("active")} className={`view-button h-9 justify-center px-1 sm:px-2.5 ${section === "active" ? "view-button-active bg-slate-100" : ""}`}><List size={14} /><span className="inline">Aktif</span></button><button onClick={() => setSection("completed")} className={`view-button h-9 justify-center px-1 sm:px-2.5 ${section === "completed" ? "view-button-active bg-slate-100" : ""}`}><History size={14} /><span className="inline">Tamamlanan</span></button><button onClick={() => setSection("cancelled")} className={`view-button h-9 justify-center px-1 sm:px-2.5 ${section === "cancelled" ? "view-button-active bg-slate-100" : ""}`}><Ban size={14} /><span className="inline">İptal Edilen</span></button></div>

      <div className="task-toolbar border-b border-slate-200 lg:items-center">
        <label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input mt-0 pl-9" placeholder="Görevlerde ara…" aria-label="Görevlerde ara" /></label>
        <button type="button" onClick={() => setFiltersOpen(true)} className={`secondary-button h-10 shrink-0 lg:hidden ${filterCount ? "border-indigo-300 text-indigo-700" : ""}`}><SlidersHorizontal size={15} />Filtreler{filterCount ? ` (${filterCount})` : ""}</button>
        <div className="hidden lg:block">{filterControls()}</div>
      </div>
      {section === "active" ? <>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5"><div className="flex min-w-0 items-center gap-2"><Checkbox checked={allVisibleSelected} indeterminate={!allVisibleSelected && someVisibleSelected} disabled={!visibleIds.length || taskSaving} onChange={toggleAllVisible} ariaLabel="Görünen görevlerin tümünü seç" /><span className="whitespace-nowrap text-xs font-semibold text-slate-600">Tümünü Seç</span><div className="ml-2 hidden rounded-lg bg-slate-100 p-1 sm:inline-flex"><button onClick={() => setView("list")} className={`view-button ${view === "list" ? "view-button-active" : ""}`}><List size={14} />Liste</button><button onClick={() => setView("board")} className={`view-button ${view === "board" ? "view-button-active" : ""}`}><Columns3 size={14} />Pano</button></div></div><div className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-500"><span className="hidden sm:inline">Sırala</span><ThemedSelect className="h-8 min-w-28 rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-slate-700 outline-none" ariaLabel="Görevleri sırala" value={sort} onValueChange={setSort} options={[{ value: "due", label: "Son tarih" }, { value: "priority", label: "Öncelik" }, { value: "newest", label: "En yeni" }]} /></div></div>
        {selectedIds.size ? <BulkTaskActions selectedCount={selectedIds.size} users={users} saving={taskSaving} onClear={clearSelection} onApply={async (action) => { const result = await bulkUpdateTasks([...selectedIds], action); setSelection({ key: selectionKey, ids: new Set(result.failedIds) }); setBulkMessage({ text: result.failedIds.length ? `${result.updatedIds.length} görev güncellendi, ${result.failedIds.length} görev güncellenemedi.` : `${result.updatedIds.length} görev güncellendi.`, error: result.failedIds.length > 0 }); }} /> : null}
        <div className={`space-y-2 bg-slate-50/50 p-3 lg:hidden ${selectedIds.size ? "pb-24" : ""}`}>{filtered.length ? filtered.map((task) => <TaskCard key={task.id} task={task} showCountdown selectable selected={selectedIds.has(task.id)} onSelectionChange={(checked) => setSelected(task.id, checked)} />) : <div className="p-8 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen aktif görev bulunamadı." : "Henüz aktif görev yok."}</div>}</div>
        <div className="hidden lg:block">{view === "list" ? <div className="overflow-x-auto"><div className="min-w-[930px]"><div className="ofus-task-table-head grid grid-cols-[32px_26px_minmax(180px,1.6fr)_minmax(140px,1fr)_64px_92px_150px_42px] gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span/><span/><span>Görev</span><span>Durum</span><span>Sorumlu</span><span>Öncelik</span><span>Son Tarih</span><span>Boyut</span></div>{filtered.length ? (sort === "due" ? ["Geciken", "Bugün", "Yaklaşan", "Tarihsiz"].map((label) => { const items = filtered.filter((task) => (taskIsOverdue(task) ? "Geciken" : taskDate(task) === localDate() ? "Bugün" : taskDate(task) ? "Yaklaşan" : "Tarihsiz") === label); return items.length ? <div key={label}><div className="ofus-task-group">{label} <span>{items.length}</span></div>{items.map((task) => <TaskRow key={task.id} task={task} showCountdown selectable selected={selectedIds.has(task.id)} onSelectionChange={(checked) => setSelected(task.id, checked)} />)}</div> : null; }) : filtered.map((task) => <TaskRow key={task.id} task={task} showCountdown selectable selected={selectedIds.has(task.id)} onSelectionChange={(checked) => setSelected(task.id, checked)} />)) : <div className="p-12 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen aktif görev bulunamadı." : "Henüz aktif görev yok."}</div>}</div></div> : <div className="overflow-x-auto bg-slate-50/50 p-4"><div className="grid min-w-[900px] grid-cols-4 gap-3">{activeStatuses.map((column) => { const items = filtered.filter((task) => task.status === column); return <section key={column}><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-xs font-bold text-slate-700">{statusLabels[column]}</h2><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">{items.length}</span></div><div className="space-y-2.5">{items.map((task) => <TaskCard key={task.id} task={task} showCountdown selectable selected={selectedIds.has(task.id)} onSelectionChange={(checked) => setSelected(task.id, checked)} />)}</div></section>; })}</div></div>}</div>
      </> : section === "completed" ? <><div className="lg:hidden">{filtered.length ? filtered.map((task) => <MobileArchiveCard key={task.id} task={task} completed />) : <div className="p-8 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen tamamlanmış görev bulunamadı." : "Henüz tamamlanan görev yok."}</div>}</div><div className="hidden overflow-x-auto lg:block"><div className="min-w-[1000px]"><div className="grid grid-cols-[minmax(210px,1.5fr)_minmax(140px,1fr)_minmax(150px,1fr)_100px_110px_120px_64px] gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><span>Görev</span><span>Firma</span><span>Proje</span><span>Sorumlu</span><span>Durum</span><span>Tamamlanma</span><span>Kontrol</span></div>{filtered.length ? filtered.map((task) => <CompletedRow key={task.id} task={task} />) : <div className="p-12 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen tamamlanmış görev bulunamadı." : "Henüz tamamlanan görev yok."}</div>}</div></div></> : <><div className="lg:hidden">{filtered.length ? filtered.map((task) => <MobileArchiveCard key={task.id} task={task} completed={false} />) : <div className="p-8 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen iptal edilmiş görev bulunamadı." : "Henüz iptal edilen görev yok."}</div>}</div><div className="hidden overflow-x-auto lg:block"><div className="min-w-[1100px]"><div className="grid grid-cols-[minmax(210px,1.5fr)_minmax(140px,1fr)_minmax(150px,1fr)_100px_110px_120px_minmax(180px,1.2fr)] gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><span>Görev</span><span>Firma</span><span>Proje</span><span>Sorumlu</span><span>Durum</span><span>İptal Tarihi</span><span>Silinme Nedeni</span></div>{filtered.length ? filtered.map((task) => <CancelledRow key={task.id} task={task} />) : <div className="p-12 text-center text-sm text-slate-400">{hasFilters ? "Bu filtrelerle eşleşen iptal edilmiş görev bulunamadı." : "Henüz iptal edilen görev yok."}</div>}</div></div></>}
    </section>
    {filtersOpen ? <div className="fixed inset-0 z-[80] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-labelledby="task-filters-title"><button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setFiltersOpen(false)} aria-label="Filtreleri kapat" /><section className="relative max-h-[88dvh] w-full overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 id="task-filters-title" className="text-sm font-semibold text-slate-900">Filtreler{filterCount ? ` (${filterCount})` : ""}</h2><button type="button" onClick={() => setFiltersOpen(false)} className="icon-button h-10 w-10" aria-label="Kapat"><X size={18} /></button></header><div className="max-h-[65dvh] overflow-y-auto p-4">{filterControls(true)}</div><footer className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/70 p-4"><button type="button" onClick={clear} className="secondary-button h-11 justify-center">Temizle</button><button type="button" onClick={() => setFiltersOpen(false)} className="primary-button h-11 justify-center">Filtreleri Uygula</button></footer></section></div> : null}
  </>;
}

