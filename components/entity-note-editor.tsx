"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "./toast";

export function EntityNoteEditor({ value, onSave, label = "Not" }: { value: string; onSave: (value: string) => Promise<void>; label?: string }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const changed = draft !== value;
  return <div className="ofus-note-editor"><label className="field-label">{label}<textarea className="input mt-2 resize-y" value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)} placeholder="Bu kayıt için bir not yazın…" /></label><button type="button" className="secondary-button mt-3 w-full" disabled={!changed || saving} onClick={async () => { setSaving(true); try { await onSave(draft); toast.show("noteAdded"); } catch { toast.show("saveError"); } finally { setSaving(false); } }}><Save size={15} />{saving ? "Kaydediliyor…" : "Notu kaydet"}</button></div>;
}
