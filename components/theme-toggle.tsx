"use client";
import { useState, useSyncExternalStore } from "react";
const themeEvent = "ofus:themechange";
function subscribe(callback: () => void) {
  window.addEventListener(themeEvent, callback);
  return () => window.removeEventListener(themeEvent, callback);
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
  const [message, setMessage] = useState("");
  const toggle = () => {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#18191B" : "#F5F6FB");
    try { localStorage.setItem("ofus.theme.v1", theme); setMessage(""); }
    catch { setMessage("Tercihiniz bu oturumda uygulandı; sonraki oturum için kaydedilemedi."); }
    window.dispatchEvent(new Event(themeEvent));
  };
  return <section className="panel p-5 sm:p-6"><h2 className="section-title">Görünüm</h2><div className="mt-5 flex items-center justify-between gap-4"><div><p className="font-medium">Koyu tema</p><p className="section-subtitle">Açık ve antrasit görünüm arasında geçiş yapın.</p></div><button type="button" role="switch" aria-checked={dark} aria-label="Koyu tema" onClick={toggle} className="theme-switch"><span /></button></div>{message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}</section>;
}
