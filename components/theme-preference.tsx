"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#18191B" : "#F5F6FB");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  try { localStorage.setItem("ofus.theme.v1", theme); } catch { /* The profile remains the persistent source. */ }
  window.dispatchEvent(new Event("ofus:themechange"));
}

export function ThemePreference({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let userChangedTheme = false;
    const changed = () => { userChangedTheme = true; };
    window.addEventListener("ofus:themechange", changed);
    void createClient().from("profiles").select("theme_preference").eq("id", userId).single().then(({ data, error }) => {
      if (cancelled || userChangedTheme || error || !data) return;
      const preference = data.theme_preference;
      applyTheme(preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
    }, () => { /* Keep the current theme if the profile cannot be reached. */ });
    return () => { cancelled = true; window.removeEventListener("ofus:themechange", changed); };
  }, [userId]);
  return null;
}
