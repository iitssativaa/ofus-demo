"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyTheme } from "./theme-preference";
import { toast } from "./toast";

function subscribe(callback: () => void) {
  window.addEventListener("ofus:themechange", callback);
  return () => window.removeEventListener("ofus:themechange", callback);
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const toggle = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    const theme = dark ? "light" : "dark";
    try {
      const client = createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error("Oturum bulunamadı.");
      const { data, error } = await client.from("profiles").update({ theme_preference: theme }).eq("id", user.id).select("theme_preference").single();
      if (error || data?.theme_preference !== theme) throw new Error("Tema tercihi kaydedilemedi.");
      applyTheme(theme);
      toast.show("settingsSaved");
    } catch {
      toast.show("saveError", { message: "Tema tercihi kaydedilemedi.", dedupeKey: "theme-save" });
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return <section className="panel p-5 sm:p-6"><h2 className="section-title">Görünüm</h2><div className="mt-5 flex items-center justify-between gap-4"><div><p className="font-medium">Koyu tema</p><p className="section-subtitle">Açık ve antrasit görünüm arasında geçiş yapın.</p></div><button type="button" role="switch" aria-checked={dark} aria-label="Koyu tema" disabled={saving} onClick={() => void toggle()} className="theme-switch"><span /></button></div></section>;
}
