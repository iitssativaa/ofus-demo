"use client";

import Link from "next/link";
import { AlertCircle, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

const toastCatalog = {
  taskCreated: ["Görev oluşturuldu.", "Görevi gör"],
  projectCreated: ["Proje oluşturuldu.", "Projeyi gör"],
  companyCreated: ["Firma eklendi.", "Firmayı gör"],
  eventCreated: ["Etkinlik takvime eklendi.", "Takvimde gör"],
  subtaskAdded: ["Alt görev eklendi."],
  noteAdded: ["Not eklendi."],
  profileSaved: ["Profil bilgilerin güncellendi."],
  linkCopied: ["Bağlantı kopyalandı."],
  saveError: ["Değişiklikler kaydedilemedi. Tekrar dene.", "Tekrar dene", "error"],
  copyError: ["Bağlantı kopyalanamadı.", "Tekrar dene", "error"],
  taskCompleted: ["Görev tamamlandı.", "Geri al"],
  taskStatusChanged: ["Görev durumu güncellendi."],
  taskAssigned: ["Görev, [kişi adı] kişisine atandı.", "Görevi gör"],
  dueDateChanged: ["Teslim tarihi güncellendi."],
  recordUpdated: ["Değişiklikler kaydedildi."],
  recordDeleted: ["[Kayıt adı] silindi.", "Geri al"],
  recordArchived: ["[Kayıt adı] arşivlendi.", "Geri al"],
  eventUpdated: ["Etkinlik güncellendi.", "Takvimde gör"],
  eventCancelled: ["Etkinlik iptal edildi.", "Takvimde gör"],
  inviteSent: ["Davet gönderildi."],
  fileUploaded: ["Dosya yüklendi.", "Dosyayı gör"],
  uploadError: ["Dosya yüklenemedi. Tekrar dene.", "Tekrar dene", "error"],
  notificationsRead: ["Tüm bildirimler okundu olarak işaretlendi."],
  settingsSaved: ["Tercihlerin kaydedildi."],
} as const;

export type ToastKey = keyof typeof toastCatalog;
type ToastOptions = {
  message?: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void | boolean | Promise<void | boolean>;
  dedupeKey?: string;
  person?: string;
  name?: string;
  scope?: HTMLElement | null;
};
type ToastRecord = ToastOptions & {
  id: string;
  key: ToastKey;
  title: string;
  defaultAction?: string;
  tone: "success" | "error";
  leaving: boolean;
};
const TOAST_EVENT = "ofus:toast";
const TOAST_COMMAND_EVENT = "ofus:toast-command";

export const toast = {
  show(key: ToastKey, options: ToastOptions = {}) {
    if (typeof window === "undefined") return;
    const id = crypto.randomUUID();
    const detail: { id: string; key: ToastKey; options: ToastOptions; resolvedId?: string } = { id, key, options };
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
    return detail.resolvedId ?? id;
  },
  dismiss(id: string) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TOAST_COMMAND_EVENT, { detail: { type: "dismiss", id } })); },
  resolve(dedupeKey: string) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TOAST_COMMAND_EVENT, { detail: { type: "resolve", dedupeKey } })); },
  clear() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TOAST_COMMAND_EVENT, { detail: { type: "clear" } })); },
};

function ToastItem({ item, onDismiss }: { item: ToastRecord; onDismiss: (id: string) => void }) {
  const remaining = useRef(item.tone === "error" ? Infinity : (item.href || item.onAction) ? 7000 : 4500);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauses = useRef(new Set<string>());
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      remaining.current = Math.max(1, remaining.current - (performance.now() - started.current));
    }
  }, []);
  const startTimer = useCallback(() => {
    if (timer.current || pauses.current.size || busyRef.current || !Number.isFinite(remaining.current) || remaining.current <= 0 || item.leaving) return;
    started.current = performance.now();
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current);
  }, [item.id, item.leaving, onDismiss]);
  const pause = useCallback((reason: string) => { stopTimer(); pauses.current.add(reason); }, [stopTimer]);
  const resume = useCallback((reason: string) => { pauses.current.delete(reason); startTimer(); }, [startTimer]);

  useEffect(() => {
    if (document.hidden) pauses.current.add("document");
    startTimer();
    const visibility = () => document.hidden ? pause("document") : resume("document");
    document.addEventListener("visibilitychange", visibility);
    return () => { stopTimer(); document.removeEventListener("visibilitychange", visibility); };
  }, [pause, resume, startTimer, stopTimer]);

  const actionLabel = item.actionLabel ?? item.defaultAction;
  const dismissOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onDismiss(item.id); }
  };
  const runAction = async () => {
    if (!item.onAction || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    pause("action");
    try {
      const result = await item.onAction();
      if (result !== false) onDismiss(item.id);
    } catch {
      toast.show("saveError", { onAction: item.onAction, dedupeKey: `retry:${item.dedupeKey ?? item.id}`, scope: item.scope });
    } finally {
      busyRef.current = false;
      setBusy(false);
      resume("action");
    }
  };
  const Icon = item.tone === "error" ? AlertCircle : Check;

  return <article
    className={`ofus-toast${item.leaving ? " is-leaving" : ""}`}
    data-tone={item.tone}
    inert={item.leaving || undefined}
    onPointerEnter={() => pause("hover")}
    onPointerLeave={() => resume("hover")}
    onFocusCapture={() => pause("focus")}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume("focus"); }}
  >
    <span className="ofus-toast-icon"><Icon aria-hidden="true" /></span>
    <span className="ofus-toast-message" role={item.tone === "error" ? "alert" : "status"} aria-atomic="true">{item.message ?? item.title}</span>
    {actionLabel && item.href ? <Link className="ofus-toast-action" href={item.href} onKeyDown={dismissOnEscape} onClick={() => onDismiss(item.id)}>{actionLabel}</Link> : null}
    {actionLabel && item.onAction && !item.href ? <button className="ofus-toast-action" type="button" disabled={busy} aria-busy={busy} onKeyDown={dismissOnEscape} onClick={() => void runAction()}>{actionLabel}</button> : null}
    <button type="button" className="ofus-toast-close" onKeyDown={dismissOnEscape} onClick={() => onDismiss(item.id)} aria-label="Bildirimi kapat"><X size={16} /></button>
  </article>;
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const records = useRef<ToastRecord[]>([]);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const removalTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const commit = useCallback((next: ToastRecord[]) => {
    records.current = next;
    setItems(next);
  }, []);
  const dismiss = useCallback((id: string) => {
    const current = records.current;
    const target = current.find((item) => item.id === id);
    if (!target || target.leaving) return;
    commit(current.map((item) => item.id === id ? { ...item, leaving: true } : item));
    if (removalTimers.current.has(id)) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      removalTimers.current.delete(id);
      commit(records.current.filter((item) => item.id !== id));
    }, reduced ? 0 : 180);
    removalTimers.current.set(id, timer);
  }, [commit]);

  useEffect(() => {
    const timers = removalTimers.current;
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; key: ToastKey; options?: ToastOptions; resolvedId?: string }>).detail;
      const entry = toastCatalog[detail?.key];
      if (!entry) return;
      const options = detail.options ?? {};
      const catalogMessage = entry[0]
        .replace("[kişi adı]", options.person || "Seçilen kişi")
        .replace("[Kayıt adı]", options.name || "Kayıt");
      const message = options.message ?? catalogMessage;
      const dedupeKey = options.dedupeKey ?? `${detail.key}:${message}:${options.href ?? ""}`;
      const current = records.current;
      const existingIndex = current.findIndex((item) => item.dedupeKey === dedupeKey);
      if (existingIndex >= 0) {
          detail.resolvedId = current[existingIndex].id;
          const pendingRemoval = removalTimers.current.get(current[existingIndex].id);
          if (pendingRemoval) clearTimeout(pendingRemoval);
          removalTimers.current.delete(current[existingIndex].id);
      } else detail.resolvedId = detail.id;
      const replacement: ToastRecord = {
          id: existingIndex >= 0 ? current[existingIndex].id : detail.id, key: detail.key, title: catalogMessage, defaultAction: entry[1],
          tone: detail.key === "saveError" || detail.key === "copyError" || detail.key === "uploadError" ? "error" : "success",
          leaving: false, dedupeKey, ...options, message,
      };
      if (existingIndex < 0) commit([...current, replacement]);
      else {
        const next = [...current];
        next[existingIndex] = replacement;
        commit(next);
      }
    };
    const command = (event: Event) => {
      const detail = (event as CustomEvent<{ type: "dismiss" | "resolve" | "clear"; id?: string; dedupeKey?: string }>).detail;
      if (detail.type === "dismiss" && detail.id) dismiss(detail.id);
      else if (detail.type === "resolve" && detail.dedupeKey) {
        const removed = records.current.filter((item) => item.dedupeKey === detail.dedupeKey);
        removed.forEach((item) => { const timer = removalTimers.current.get(item.id); if (timer) clearTimeout(timer); removalTimers.current.delete(item.id); });
        commit(records.current.filter((item) => item.dedupeKey !== detail.dedupeKey));
      } else if (detail.type === "clear") {
        removalTimers.current.forEach(clearTimeout);
        removalTimers.current.clear();
        commit([]);
      }
    };
    window.addEventListener(TOAST_EVENT, receive);
    window.addEventListener(TOAST_COMMAND_EVENT, command);
    return () => { window.removeEventListener(TOAST_EVENT, receive); window.removeEventListener(TOAST_COMMAND_EVENT, command); timers.forEach(clearTimeout); timers.clear(); };
  }, [commit, dismiss]);

  useEffect(() => {
    const syncHostAndScopes = () => {
      const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
        .filter((dialog) => dialog.isConnected && !dialog.closest('[hidden], [inert], [aria-hidden="true"]') && dialog.getClientRects().length > 0);
      setHost(dialogs.at(-1) ?? document.body);
      const current = records.current;
      const next = current.filter((item) => {
        if (item.tone !== "error" || !item.scope) return true;
        if (!item.scope.isConnected || item.scope.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        return !(item.scope instanceof HTMLDialogElement) || item.scope.open;
      });
      if (next.length !== current.length) commit(next);
    };
    syncHostAndScopes();
    const observer = new MutationObserver(syncHostAndScopes);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-modal", "aria-hidden", "inert"] });
    document.addEventListener("close", syncHostAndScopes, true);
    return () => { observer.disconnect(); document.removeEventListener("close", syncHostAndScopes, true); };
  }, [commit]);

  if (!host) return null;
  return createPortal(<section className="ofus-toast-viewport" aria-label="Bildirimler">{items.slice(0, 3).map((item) => <ToastItem key={item.id} item={item} onDismiss={dismiss} />)}</section>, host);
}
