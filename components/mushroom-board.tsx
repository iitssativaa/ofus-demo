"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, MoreHorizontal, Pencil, Plus, StickyNote, Trash2, X } from "lucide-react";
import { localDate } from "@/lib/task-selectors";
import type { MushroomBoardNote, MushroomBoardNoteInput, MushroomNotePriority } from "@/lib/types";
import { createMushroomBoardNote, deleteMushroomBoardNote, updateMushroomBoardNote } from "@/lib/supabase/mushroom-board-client";
import { ThemedSelect } from "./themed-select";
import { UserAvatar } from "./user-avatar";
import { useWorkspace } from "./app-provider";
import { useDialogFocus } from "./use-dialog-focus";
import { toast } from "./toast";

const priorityOptions = [
  { value: "1", label: "1. Öncelik" },
  { value: "2", label: "2. Öncelik" },
  { value: "3", label: "3. Öncelik" },
];

const priorityStyles: Record<MushroomNotePriority, string> = {
  1: "border-l-rose-500 bg-rose-50/45",
  2: "border-l-amber-500 bg-amber-50/35",
  3: "border-l-emerald-500 bg-emerald-50/30",
};

const priorityLabels: Record<MushroomNotePriority, string> = {
  1: "1. Öncelik",
  2: "2. Öncelik",
  3: "3. Öncelik",
};

function sortNotes(notes: MushroomBoardNote[]) {
  return [...notes].sort((a, b) =>
    a.noteDate.localeCompare(b.noteDate)
    || a.priority - b.priority
    || b.createdAt.localeCompare(a.createdAt)
    || b.id.localeCompare(a.id));
}

function dateLabel(value: string) {
  const today = localDate();
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedTomorrow = localDate(tomorrow);
  const absolute = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
  if (value === today) return `Bugün · ${absolute}`;
  if (value === formattedTomorrow) return `Yarın · ${absolute}`;
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function MushroomBoard({ initialNotes, currentUserId }: { initialNotes: MushroomBoardNote[]; currentUserId: string }) {
  const { users } = useWorkspace();
  const [notes, setNotes] = useState(() => sortNotes(initialNotes));
  const [editing, setEditing] = useState<MushroomBoardNote | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<MushroomBoardNote | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const sorted = useMemo(() => sortNotes(notes), [notes]);
  const visible = expanded ? sorted : sorted.slice(0, 8);
  const groups = visible.reduce<Map<string, MushroomBoardNote[]>>((map, note) => {
    map.set(note.noteDate, [...(map.get(note.noteDate) ?? []), note]);
    return map;
  }, new Map());

  return <section className="mushroom-board panel overflow-hidden" aria-labelledby="mushroom-board-title">
    <div className="panel-header gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 rounded-lg bg-amber-50 p-2 text-amber-700"><StickyNote size={17} /></span>
        <div className="min-w-0"><h2 id="mushroom-board-title" className="section-title">Mantar Pano</h2><p className="section-subtitle">Ortak tarihli notlar ve kısa hatırlatmalar</p></div>
      </div>
      <button type="button" onClick={() => { setError(""); setEditing(null); }} className="secondary-button shrink-0"><Plus size={15} /><span>Not Ekle</span></button>
    </div>
    {error ? <p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 sm:mx-5">{error}</p> : null}
    {visible.length ? <div className="divide-y divide-slate-100">
      {[...groups.entries()].map(([date, items]) => <div key={date} className="grid gap-2 px-4 py-3 ofus-note-group sm:px-5">
        <div className="flex items-center gap-2 self-start pt-2 text-xs font-semibold text-slate-600"><CalendarDays size={14} className="text-slate-400" /><time dateTime={date}>{dateLabel(date)}</time></div>
        <div className="space-y-2">{items.map((note) => <article key={note.id} className={`board-note group flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-slate-200 border-l-[3px] px-3 py-2.5 ${priorityStyles[note.priority]}`}>
          <UserAvatar userId={note.createdBy} size="lg" /><div className="board-note-content min-w-0 flex-1"><p className="mb-2 text-sm font-medium">{users.find((user) => user.id === note.createdBy)?.name ?? "Bilinmeyen kullanıcı"}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">{note.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
              <span className="font-semibold">{priorityLabels[note.priority]}</span>
              {note.updatedAt !== note.createdAt ? <><span aria-hidden="true">·</span><span>Düzenlendi</span></> : null}
            </div>
          </div>
          {note.createdBy === currentUserId ? <div className="board-note-actions flex shrink-0 items-center gap-1" aria-label="Not seçenekleri">
            <button type="button" onClick={() => { setError(""); setEditing(note); }} className="icon-button" aria-label="Notu düzenle"><Pencil size={14} /></button>
            <button type="button" onClick={() => setDeleting(note)} className="icon-button text-rose-600" aria-label="Notu sil"><Trash2 size={14} /></button>
          </div> : <MoreHorizontal size={15} className="mt-1 shrink-0 text-slate-300" aria-hidden="true" />}
        </article>)}</div>
      </div>)}
    </div> : <div className="px-5 py-8 text-center"><StickyNote size={21} className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Henüz Mantar Pano notu yok.</p><p className="mt-1 text-xs text-slate-400">İlk ortak notu ekleyerek başlayın.</p></div>}
    {sorted.length > 8 ? <div className="border-t border-slate-100 px-4 py-3 text-center"><button type="button" onClick={() => setExpanded((value) => !value)} className="text-link">{expanded ? "Daha az göster" : `Tümünü Gör (${sorted.length})`}</button></div> : null}
    {editing !== undefined ? <MushroomNoteForm note={editing ?? undefined} onCancel={() => setEditing(undefined)} onSave={async (input, requestId) => {
      try {
        const saved = editing ? await updateMushroomBoardNote(editing.id, input) : await createMushroomBoardNote(input, requestId);
        setNotes((current) => editing ? current.map((note) => note.id === saved.id ? saved : note) : [...current, saved]);
        setError("");
        setEditing(undefined);
        toast.show(editing ? "recordUpdated" : "noteAdded", { message: editing ? "Not güncellendi" : "Not eklendi" });
      } catch {
        toast.show("saveError", { message: editing ? "Not güncellenemedi" : "Not eklenemedi" });
        throw new Error(editing ? "Not güncellenemedi." : "Not eklenemedi.");
      }
    }} /> : null}
    {deleting ? <DeleteNoteDialog note={deleting} onCancel={() => setDeleting(null)} onDelete={async () => {
      try {
        await deleteMushroomBoardNote(deleting.id);
        setNotes((current) => current.filter((note) => note.id !== deleting.id));
        setDeleting(null);
        setError("");
        toast.show("recordDeleted", { message: "Not silindi" });
      } catch {
        setDeleting(null);
        setError("Not silinemedi. Lütfen tekrar deneyin.");
        toast.show("saveError", { message: "Not silinemedi" });
      }
    }} /> : null}
  </section>;
}

function MushroomNoteForm({ note, onCancel, onSave }: { note?: MushroomBoardNote; onCancel: () => void; onSave: (input: MushroomBoardNoteInput, requestId: string) => Promise<void> }) {
  const [content, setContent] = useState(note?.content ?? "");
  const [noteDate, setNoteDate] = useState(note?.noteDate ?? localDate());
  const [priority, setPriority] = useState<MushroomNotePriority>(note?.priority ?? 2);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const close = () => { if (!lock.current && !submitting) onCancel(); };
  useDialogFocus(true, close);
  const requestId = useRef("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return setError("Not alanı boş bırakılamaz.");
    if (content.trim().length > 1000) return setError("Not en fazla 1000 karakter olabilir.");
    if (!noteDate) return setError("Tarih seçmelisiniz.");
    if (lock.current) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    lock.current = true;
    setSubmitting(true);
    setError("");
    try { await onSave({ content: content.trim(), noteDate, priority }, requestId.current); }
    catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Not kaydedilemedi.");
      lock.current = false;
      setSubmitting(false);
    }
  };
  return <div className="responsive-dialog z-[70]" role="dialog" aria-modal="true" aria-labelledby="mushroom-note-form-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Not formunu kapat" />
    <form onSubmit={submit} className="responsive-dialog-panel max-w-lg">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 id="mushroom-note-form-title" className="text-sm font-semibold text-slate-950">{note ? "Notu Düzenle" : "Mantar Panoya Not Ekle"}</h3><p className="mt-0.5 text-xs text-slate-400">Kısa, tarihli ve ortak bir not paylaşın.</p></div><button type="button" disabled={submitting} onClick={close} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
      <div className="responsive-dialog-body grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="field-label sm:col-span-2">Not <span className="text-rose-500">*</span><textarea className="input min-h-28 resize-none" maxLength={1000} value={content} onChange={(event) => { setContent(event.target.value); if (error) setError(""); }} placeholder="Panoya kısa bir not bırakın…" /></label>
        <label className="field-label">Tarih <span className="text-rose-500">*</span><input type="date" className="input" value={noteDate} onChange={(event) => setNoteDate(event.target.value)} /></label>
        <div><p className="field-label">Öncelik <span className="text-rose-500">*</span></p><ThemedSelect value={String(priority)} options={priorityOptions} onValueChange={(value) => setPriority(Number(value) as MushroomNotePriority)} ariaLabel="Not önceliği" /></div>
        {error ? <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      </div>
      <footer className="responsive-dialog-footer"><button type="button" disabled={submitting} onClick={close} className="secondary-button">İptal</button><button type="submit" disabled={submitting} className="primary-button disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Kaydediliyor…" : "Kaydet"}</button></footer>
    </form>
  </div>;
}

function DeleteNoteDialog({ note, onCancel, onDelete }: { note: MushroomBoardNote; onCancel: () => void; onDelete: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const deleteLock = useRef(false);
  const close = () => { if (!deleteLock.current && !deleting) onCancel(); };
  useDialogFocus(true, close);
  return <div className="responsive-dialog z-[80]" role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title">
    <button type="button" className="absolute inset-0" onClick={close} aria-label="Silme onayını kapat" />
    <div className="responsive-dialog-panel max-w-md p-5">
      <h3 id="delete-note-title" className="text-base font-semibold text-slate-950">Not silinsin mi?</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">“{note.content}” kalıcı olarak silinecek.</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={deleting} onClick={close} className="secondary-button">İptal</button><button type="button" disabled={deleting} onClick={async () => { if (deleteLock.current) return; deleteLock.current = true; setDeleting(true); try { await onDelete(); } catch { deleteLock.current = false; setDeleting(false); } }} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><Trash2 size={14} />{deleting ? "Siliniyor…" : "Sil"}</button></div>
    </div>
  </div>;
}

