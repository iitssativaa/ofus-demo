"use client";

import { SignOutButton } from "./sign-out-button";
import { BrandMark } from "./brand-mark";

export function BootstrapError() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-6 text-center shadow-xl shadow-slate-950/[0.05]"><BrandMark className="text-xl" /><h1 className="mt-5 text-base font-semibold text-slate-900">Çalışma alanı hazırlanamadı</h1><p className="mt-2 text-sm leading-6 text-slate-500">Bağlantıyı ve Supabase kurulumunu kontrol edip tekrar deneyin.</p><div className="mt-5 space-y-2"><button className="primary-button w-full" onClick={() => window.location.reload()}>Tekrar Dene</button><SignOutButton full /></div></div></main>;
}
