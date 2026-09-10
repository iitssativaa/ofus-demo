"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  const router = useRouter();
  const page = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const exitAnimation = useRef<Animation | null>(null);
  useEffect(() => {
    const isolated: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null = page.current;
    while (branch?.parentElement && branch !== document.body) {
      const parent = branch.parentElement;
      [...parent.children].forEach((element) => {
        if (!(element instanceof HTMLElement) || element === branch || element.matches("script,style,link,.ofus-toast-viewport")) return;
        isolated.push({ element, inert: element.hasAttribute("inert") });
        element.setAttribute("inert", "");
      });
      branch = parent;
    }
    page.current?.querySelector<HTMLElement>("h1")?.focus();
    return () => {
      exitAnimation.current?.cancel();
      exitAnimation.current = null;
      isolated.forEach(({ element, inert }) => { if (!inert) element.removeAttribute("inert"); });
    };
  }, []);
  const navigate = async (href?: string) => {
    if (leaving.current) return;
    leaving.current = true;
    page.current?.setAttribute("inert", "");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && page.current) {
      const animation = page.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease-in-out", fill: "forwards" });
      exitAnimation.current = animation;
      await animation.finished.catch(() => undefined);
      if (exitAnimation.current !== animation) return;
    }
    if (!page.current?.isConnected) return;
    if (href) router.push(href);
    else if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) router.back();
    else router.push("/dashboard");
  };
  return <div ref={page} className="ofus-final-404">
    <Link className="error-brand" href="/giris" aria-label="OfUs · Giriş sayfası" onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate("/giris"); }}><BrandMark /></Link>
    <main className="error-card" aria-labelledby="error-title"><div className="error-content">
      <div className="error-art" aria-hidden="true"><span>4</span><svg className="error-zero" viewBox="-5 -5 78 63"><circle cx="34" cy="26.5" r="24" fill="none" stroke="currentColor" strokeWidth="7.5" /></svg><span>4</span></div>
      <p className="error-code">404 · SAYFA BULUNAMADI</p>
      <h1 id="error-title" tabIndex={-1}>Burada bir sayfa yok.</h1>
      <p className="error-description">Bağlantı değişmiş veya sayfa kaldırılmış olabilir.<br /> Çalışma alanına dönerek devam edebilirsin.</p>
      <div className="error-actions"><Link className="error-button primary" href="/dashboard" onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate("/dashboard"); }}><span>Ana sayfaya dön</span><ArrowRight /></Link><button className="error-button secondary" onClick={() => void navigate()}><ArrowLeft /><span>Geri git</span></button></div>
      <p className="error-login">Hesabına dönmek için <Link href="/giris">giriş yap</Link>.</p>
    </div></main>
    <p className="error-footer">OfUs · Ortak çalışma alanı</p>
  </div>;
}
