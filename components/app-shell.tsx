"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
import { useWorkspace } from "./app-provider";
import { SignOutButton } from "./sign-out-button";
import type { AuthenticatedWorkspace } from "@/lib/supabase/bootstrap";
import { profileUpdatedEvent, type ProfileUpdatedDetail } from "@/lib/profile-events";
import { Avatar } from "./avatar";
import { BrandMark } from "./brand-mark";
import { ThemePreference } from "./theme-preference";
import { PageMotion } from "./motion/page-motion";
import { FormDraftProvider } from "./form-draft-provider";

const navItems = [
  { href: "/dashboard", label: "Genel Bakış", icon: "chart" },
  { href: "/tasks", label: "Görevler", icon: "task" },
  { href: "/projects", label: "Projeler", icon: "project" },
  { href: "/companies", label: "Firmalar", icon: "building" },
  { href: "/calendar", label: "Takvim", icon: "calendar" },
  { href: "/inbox", label: "Gelen Kutusu", icon: "mailbox" },
  { href: "/settings", label: "Ayarlar", icon: "settings" },
];
export function AppShell({ children, currentUser }: { children: React.ReactNode; currentUser: AuthenticatedWorkspace }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileNavOpen, setMobileNavOpen } = useWorkspace();
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobilePanel = useRef<HTMLElement>(null);
  const [profile, setProfile] = useState({ displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl });
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => { if (desktop.matches) setMobileNavOpen(false); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, [setMobileNavOpen]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (detail.userId !== currentUser.userId) return;
      setProfile((current) => ({ displayName: detail.displayName ?? current.displayName, avatarUrl: "avatarUrl" in detail ? detail.avatarUrl ?? null : current.avatarUrl }));
    };
    window.addEventListener(profileUpdatedEvent, update);
    return () => window.removeEventListener(profileUpdatedEvent, update);
  }, [currentUser.userId]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].some((dialog) => !dialog.closest('[inert],[hidden],[aria-hidden="true"]') && dialog.getClientRects().length > 0)) return;
      const item = navItems[Number(event.key) - 1];
      if (item) { event.preventDefault(); router.push(item.href); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [router]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const overflow = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = "hidden";
    mobilePanel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
      if (event.key !== "Tab") return;
      const elements = mobilePanel.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keys); trigger?.focus(); };
  }, [mobileNavOpen, setMobileNavOpen]);
  const navigation = (mobile = false) => <nav aria-label={mobile ? "Mobil ana menü" : "Ana menü"} className="ofus-nav">{navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} aria-current={pathname === item.href || pathname.startsWith(item.href + "/") ? "page" : undefined} aria-label={item.label} className="ofus-nav-link"><svg viewBox="0 0 64 64" aria-hidden="true"><use href={`/ofus/navigation.svg#ofus-nav-${item.icon}`} /></svg><span>{item.label}</span></Link>)}</nav>;
  const account = <div className="ofus-account"><Link href="/settings" aria-label={`${profile.displayName} — Profilim`} title={profile.displayName}><Avatar name={profile.displayName} initials={profile.displayName.slice(0, 1).toLocaleUpperCase("tr-TR")} src={profile.avatarUrl} /></Link><div className="ofus-account-menu"><p>{profile.displayName}</p><p className="text-sm text-slate-400">{currentUser.workspaceName}</p><Link href="/demo-guide" className="secondary-button"><BookOpen size={16} />Demo Yönergesi</Link><Link href="/board" className="secondary-button">Mantar Pano</Link><SignOutButton /></div></div>;
  return <FormDraftProvider scope={`${currentUser.userId}:${currentUser.workspaceId}`}><div className="ofus-app"><ThemePreference userId={currentUser.userId} />
    <a className="ofus-skip" href="#main">İçeriğe geç</a>
    <aside className="ofus-rail"><Link href="/dashboard" className="ofus-rail-brand" aria-label="OfUs ana sayfa"><BrandMark /></Link>{navigation()}{account}</aside>
    <header className="ofus-mobile-header"><button ref={menuButton} className="icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Menüyü aç" aria-expanded={mobileNavOpen}><Menu size={22} /></button><BrandMark /><Link href="/settings" aria-label="Profilim"><Avatar name={profile.displayName} initials={profile.displayName.slice(0, 1)} src={profile.avatarUrl} /></Link></header>
    <div className="ofus-mobile-overlay" data-open={mobileNavOpen} aria-hidden={!mobileNavOpen} inert={!mobileNavOpen}><button className="ofus-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Menüyü kapat" /><aside ref={mobilePanel} role="dialog" aria-modal="true" aria-label="Ana menü" className="ofus-mobile-menu"><div className="flex items-center justify-between"><BrandMark /><button className="icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Kapat"><X size={22} /></button></div>{navigation(true)}<Link href="/demo-guide" onClick={() => setMobileNavOpen(false)} className="secondary-button"><BookOpen size={16} />Demo Yönergesi</Link><Link href="/board" onClick={() => setMobileNavOpen(false)} className="secondary-button">Mantar Pano</Link><SignOutButton /></aside></div>
    <main id="main" tabIndex={-1} className="ofus-main" inert={mobileNavOpen}><PageMotion>{children}</PageMotion></main>
  </div></FormDraftProvider>;
}
