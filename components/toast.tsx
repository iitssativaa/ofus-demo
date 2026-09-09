"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const toastCatalog = {
  taskCreated: ["Görev oluşturuldu", "success"], projectCreated: ["Proje oluşturuldu", "success"], companyCreated: ["Firma oluşturuldu", "success"], eventCreated: ["Etkinlik oluşturuldu", "success"], subtaskAdded: ["Alt görev eklendi", "success"], noteAdded: ["Not kaydedildi", "success"], profileSaved: ["Profil kaydedildi", "success"], linkCopied: ["Bağlantı kopyalandı", "success"],
  saveError: ["Değişiklik kaydedilemedi", "error"], copyError: ["Bağlantı kopyalanamadı", "error"], uploadError: ["Dosya yüklenemedi", "error"],
  taskCompleted: ["Görev tamamlandı", "success"], taskStatusChanged: ["Görev durumu güncellendi", "info"], taskAssigned: ["Görev sorumlusu güncellendi", "info"], dueDateChanged: ["Son tarih güncellendi", "info"], recordUpdated: ["Değişiklikler kaydedildi", "success"], recordDeleted: ["Kayıt silindi", "success"], recordArchived: ["Kayıt arşivlendi", "success"], eventUpdated: ["Etkinlik güncellendi", "success"], eventCancelled: ["Etkinlik iptal edildi", "info"], inviteSent: ["Davet gönderildi", "success"], fileUploaded: ["Dosya yüklendi", "success"], notificationsRead: ["Bildirimler okundu", "success"], settingsSaved: ["Ayarlar kaydedildi", "success"],
} as const satisfies Record<string, readonly [string, "success" | "info" | "error"]>;

export type ToastKey = keyof typeof toastCatalog;
type ToastOptions = { message?: string; actionLabel?: string; href?: string; onAction?: () => void; dedupeKey?: string };
type ToastRecord = ToastOptions & { id: string; key: ToastKey; title: string; tone: "success" | "info" | "error"; createdAt: number };
const TOAST_EVENT = "ofus:toast";

export const toast = {
  show(key: ToastKey, options: ToastOptions = {}) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { key, options } }));
  },
};

function ToastItem({ item, onDismiss }: { item: ToastRecord; onDismiss: (id: string) => void }) {
  const remaining = useRef(item.tone === "error" ? Infinity : item.actionLabel ? 7000 : 4500);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paused = useRef(false);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!paused.current && Number.isFinite(remaining.current)) remaining.current -= Date.now() - started.current;
    paused.current = true;
  }, []);
  const start = useCallback(() => {
    if (!Number.isFinite(remaining.current) || remaining.current <= 0) return;
    paused.current = false;
    started.current = Date.now();
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current);
  }, [item.id, onDismiss]);
  useEffect(() => {
    start();
    const visibility = () => document.hidden ? stop() : start();
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [start, stop]);
  const Icon = item.tone === "error" ? AlertCircle : item.tone === "success" ? CheckCircle2 : Info;
  return <article className="ofus-toast" data-tone={item.tone} role={item.tone === "error" ? "alert" : "status"} onMouseEnter={stop} onMouseLeave={start} onFocus={stop} onBlur={start}>
    <Icon className="ofus-toast-icon" size={20} aria-hidden="true" />
    <p>{item.message ?? item.title}</p>
    {item.actionLabel && item.href ? <Link href={item.href} onClick={() => onDismiss(item.id)}>{item.actionLabel}</Link> : item.actionLabel && item.onAction ? <button type="button" onClick={() => { item.onAction?.(); onDismiss(item.id); }}>{item.actionLabel}</button> : null}
    <button type="button" className="ofus-toast-close" onClick={() => onDismiss(item.id)} aria-label="Bildirimi kapat"><X size={16} /></button>
  </article>;
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  useEffect(() => {
    const receive = (event: Event) => {
      const { key, options } = (event as CustomEvent<{ key: ToastKey; options: ToastOptions }>).detail;
      const entry = toastCatalog[key];
      if (!entry) return;
      const dedupeKey = options.dedupeKey ?? key;
      setItems((current) => {
        const next = current.filter((item) => (item.dedupeKey ?? item.key) !== dedupeKey);
        return [...next, { id: crypto.randomUUID(), key, title: entry[0], tone: entry[1], createdAt: Date.now(), ...options }].slice(-3);
      });
    };
    window.addEventListener(TOAST_EVENT, receive);
    return () => window.removeEventListener(TOAST_EVENT, receive);
  }, []);
  return <section className="ofus-toast-viewport" aria-label="Bildirimler" aria-live="polite">{items.map((item) => <ToastItem key={item.id} item={item} onDismiss={dismiss} />)}</section>;
}
