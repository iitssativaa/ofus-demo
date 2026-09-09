"use client";

import { useRef, useState, type FormEvent } from "react";
import { Ban, CalendarDays, Flag, ListChecks, UserRoundCog, X } from "lucide-react";
import { priorityLabels, statusLabels } from "@/lib/i18n";
import { localDate } from "@/lib/task-selectors";
import type { BulkTaskAction, DeletionReason, Priority, Status, User } from "@/lib/types";
import { ThemedSelect } from "./themed-select";

type ActionKind = BulkTaskAction["type"];

const activeStatuses: Exclude<Status, "Done">[] = ["To Do", "In Progress", "Waiting", "Review"];
const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
const cancellationReasons: Exclude<DeletionReason, "Yanlış eklendi">[] = ["Müşteri işi iptal etti", "İş artık gerekli değil", "Başka görevle birleştirildi", "Diğer"];
const actions: { type: ActionKind; label: string; icon: typeof Ban; destructive?: boolean }[] = [
  { type: "assignee", label: "Sorumlu Değiştir", icon: UserRoundCog },
  { type: "due_date", label: "Son Tarih Değiştir", icon: CalendarDays },
  { type: "status", label: "Durum Değiştir", icon: ListChecks },
  { type: "priority", label: "Öncelik Değiştir", icon: Flag },
  { type: "cancel", label: "İptal Et", icon: Ban, destructive: true },
];

export function BulkTaskActions({ selectedCount, users, saving, onClear, onApply }: {
  selectedCount: number;
  users: User[];
  saving: boolean;
  onClear: () => void;
  onApply: (action: BulkTaskAction) => Promise<void>;
}) {
  const [action, setAction] = useState<ActionKind | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <>
    <div className="bulk-action-bar fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-xl border p-3 shadow-xl backdrop-blur lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-3 lg:mx-3 lg:my-3">
      <p className="shrink-0 text-sm font-bold text-slate-800">{selectedCount} görev seçildi</p>
      <div className="hidden min-w-0 flex-wrap items-center justify-end gap-1.5 lg:flex">{actions.map(({ type, label, icon: Icon, destructive }) => <button key={type} type="button" disabled={saving} onClick={() => setAction(type)} className={destructive ? "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50" : "secondary-button h-9 px-3"}><Icon size={14} />{label}</button>)}<button type="button" disabled={saving} onClick={onClear} className="text-link h-9 px-2">Seçimi Temizle</button></div>
      <div className="flex items-center gap-2 lg:hidden"><button type="button" disabled={saving} onClick={() => setMobileMenuOpen(true)} className="primary-button">İşlemler</button><button type="button" disabled={saving} onClick={onClear} className="icon-button" aria-label="Seçimi temizle"><X size={17} /></button></div>
    </div>
    {mobileMenuOpen ? <div className="responsive-dialog z-[70] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="bulk-mobile-title"><button type="button" className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} aria-label="Toplu işlemleri kapat" /><section className="responsive-dialog-panel"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 id="bulk-mobile-title" className="text-sm font-semibold text-slate-950">Toplu İşlemler</h2><p className="text-xs text-slate-400">{selectedCount} görev seçildi</p></div><button type="button" onClick={() => setMobileMenuOpen(false)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header><div className="responsive-dialog-body grid gap-2 p-4">{actions.map(({ type, label, icon: Icon, destructive }) => <button key={type} type="button" onClick={() => { setMobileMenuOpen(false); setAction(type); }} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold ${destructive ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><Icon size={16} />{label}</button>)}<button type="button" onClick={() => { onClear(); setMobileMenuOpen(false); }} className="secondary-button mt-1 h-11 justify-center">Seçimi Temizle</button></div></section></div> : null}
    {action ? <BulkActionDialog action={action} selectedCount={selectedCount} users={users} saving={saving} onCancel={() => setAction(null)} onApply={async (value) => { await onApply(value); setAction(null); }} /> : null}
  </>;
}

function BulkActionDialog({ action, selectedCount, users, saving, onCancel, onApply }: {
  action: ActionKind;
  selectedCount: number;
  users: User[];
  saving: boolean;
  onCancel: () => void;
  onApply: (action: BulkTaskAction) => Promise<void>;
}) {
  const [assigneeId, setAssigneeId] = useState(users[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(localDate());
  const [dueTime, setDueTime] = useState("17:00");
  const [status, setStatus] = useState<Exclude<Status, "Done">>("To Do");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [reason, setReason] = useState<Exclude<DeletionReason, "Yanlış eklendi">>("Müşteri işi iptal etti");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const close = () => { if (!lock.current && !saving) onCancel(); };
  const config = actions.find((item) => item.type === action)!;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current || saving) return;
    if (action === "assignee" && !assigneeId) return setError("Sorumlu seçmelisiniz.");
    if (action === "due_date" && (!dueDate || !dueTime)) return setError("Geçerli bir son tarih ve saat seçmelisiniz.");
    lock.current = true;
    setError("");
    const value: BulkTaskAction = action === "assignee" ? { type: action, assigneeId }
      : action === "due_date" ? { type: action, dueDate, dueTime }
      : action === "status" ? { type: action, status }
      : action === "priority" ? { type: action, priority }
      : { type: action, reason, note: note.trim() || undefined };
    try { await onApply(value); }
    catch { setError("Toplu işlem tamamlanamadı."); lock.current = false; }
  };
  return <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="bulk-action-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Toplu işlem formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-md">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="bulk-action-title" className="text-sm font-semibold text-slate-950">{config.label}</h2><p className="mt-0.5 text-xs text-slate-400">Değişiklik {selectedCount} göreve uygulanacak.</p></div><button type="button" disabled={saving} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body space-y-4 p-4 sm:p-5">
        {action === "assignee" ? <div><p className="field-label">Sorumlu</p><ThemedSelect value={assigneeId} onValueChange={setAssigneeId} options={users.map((user) => ({ value: user.id, label: user.name }))} ariaLabel="Yeni sorumlu" /></div> : null}
        {action === "due_date" ? <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_120px]"><label className="field-label">Son Tarih<input type="date" lang="tr" className="input" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label className="field-label">Saat<input type="time" lang="tr" className="input" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></label></div> : null}
        {action === "status" ? <div><p className="field-label">Durum</p><ThemedSelect value={status} onValueChange={(value) => setStatus(value as Exclude<Status, "Done">)} options={activeStatuses.map((item) => ({ value: item, label: statusLabels[item] }))} ariaLabel="Yeni durum" /></div> : null}
        {action === "priority" ? <div><p className="field-label">Öncelik</p><ThemedSelect value={priority} onValueChange={(value) => setPriority(value as Priority)} options={priorities.map((item) => ({ value: item, label: priorityLabels[item] }))} ariaLabel="Yeni öncelik" /></div> : null}
        {action === "cancel" ? <><div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">Seçilen görevler iptal arşivine taşınır; hiçbir görev kalıcı olarak silinmez.</div><div><p className="field-label">İptal Nedeni</p><ThemedSelect value={reason} onValueChange={(value) => setReason(value as Exclude<DeletionReason, "Yanlış eklendi">)} options={cancellationReasons.map((item) => ({ value: item, label: item }))} ariaLabel="İptal nedeni" /></div><label className="field-label">Ek Not <span className="font-normal text-slate-400">(isteğe bağlı)</span><textarea className="input min-h-20 resize-none" value={note} onChange={(event) => setNote(event.target.value)} placeholder="İptalle ilgili ortak not…" /></label></> : null}
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={saving} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={saving} className={action === "cancel" ? "primary-button destructive-button" : "primary-button disabled:opacity-60"}>{saving ? "Uygulanıyor…" : action === "cancel" ? "Görevleri İptal Et" : "Uygula"}</button></footer>
    </form>
  </div>;
}
