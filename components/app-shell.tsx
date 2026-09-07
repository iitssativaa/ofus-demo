"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Building2, CalendarDays, CheckSquare2, ChevronLeft, ChevronRight, FolderKanban, Inbox, LayoutDashboard, Menu, Settings, X } from "lucide-react";
import { useWorkspace } from "./app-provider";
import { SignOutButton } from "./sign-out-button";
import type { AuthenticatedWorkspace } from "@/lib/supabase/bootstrap";
import { profileUpdatedEvent, type ProfileUpdatedDetail } from "@/lib/profile-events";
import { Avatar } from "./avatar";

const navItems = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/tasks", label: "Görevler", icon: CheckSquare2 },
  { href: "/projects", label: "Projeler", icon: FolderKanban },
  { href: "/companies", label: "Firmalar", icon: Building2 },
  { href: "/calendar", label: "Takvim", icon: CalendarDays },
  { href: "/inbox", label: "Gelen Kutusu", icon: Inbox },
  { href: "/settings", label: "Ayarlar", icon: Settings },
  { href: "/demo-guide", label: "Demo Yönergesi", icon: BookOpen },
];

function DemoWordmark({ compact = false }: { compact?: boolean }) {
  return <span aria-label="Demo" className={`demo-wordmark ${compact ? "text-sm" : "text-lg"}`}><span aria-hidden="true">DEMO</span></span>;
}

function SidebarContent({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspace();
  const collapsed = mobile ? false : sidebarCollapsed;
  return (
    <>
      <div className={`app-sidebar-brand flex h-16 items-center ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <div data-collapsed={collapsed} className={`app-brand-mark flex h-10 items-center ${collapsed ? "w-12 justify-center" : "w-36"}`}><DemoWordmark compact={collapsed} /></div>
      </div>
      <nav className="app-sidebar-nav flex-1 space-y-1 px-3 py-3" aria-label="Ana menü">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} onClick={onNavigate} className={`nav-item min-h-11 ${active ? "nav-item-active" : ""}`} title={collapsed ? item.label : undefined}><Icon size={17} />{!collapsed ? <span>{item.label}</span> : null}</Link>;
        })}
      </nav>
      <div className="app-sidebar-footer p-3">
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="app-collapse-control nav-item hidden w-full lg:flex" aria-label={sidebarCollapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}>{sidebarCollapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Daralt</span></>}</button>
      </div>
    </>
  );
}

export function AppShell({ children, currentUser }: { children: React.ReactNode; currentUser: AuthenticatedWorkspace }) {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useWorkspace();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [profile, setProfile] = useState({ displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl });
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (detail.userId !== currentUser.userId) return;
      setProfile((current) => ({
        displayName: detail.displayName ?? current.displayName,
        avatarUrl: "avatarUrl" in detail ? detail.avatarUrl ?? null : current.avatarUrl,
      }));
    };
    window.addEventListener(profileUpdatedEvent, update);
    return () => window.removeEventListener(profileUpdatedEvent, update);
  }, [currentUser.userId]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      menuButton?.focus();
    };
  }, [mobileNavOpen, setMobileNavOpen]);
  return (
    <div className="min-h-screen bg-background">
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r lg:flex transition-[width] ${sidebarCollapsed ? "w-[72px]" : "w-[224px]"}`}><SidebarContent /></aside>
      <div className={`fixed inset-0 z-50 transition lg:hidden ${mobileNavOpen ? "visible" : "pointer-events-none invisible"}`} aria-hidden={!mobileNavOpen} inert={!mobileNavOpen}><button className={`absolute inset-0 bg-slate-950/35 transition-opacity ${mobileNavOpen ? "opacity-100" : "opacity-0"}`} aria-label="Menüyü kapat" onClick={() => setMobileNavOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="Ana menü" className={`app-sidebar app-mobile-sidebar relative flex h-full w-[min(84vw,300px)] flex-col shadow-2xl transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}><button ref={closeButtonRef} className="absolute right-3 top-3 icon-button h-10 w-10" onClick={() => setMobileNavOpen(false)} aria-label="Menüyü kapat"><X size={19} /></button><SidebarContent mobile onNavigate={() => setMobileNavOpen(false)} /></aside></div>
      <div className={`transition-[padding] ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[224px]"}`}>
        <header className="app-topbar sticky top-0 z-20 flex h-14 items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
           <div className="flex min-w-0 items-center gap-2 sm:gap-3"><button ref={menuButtonRef} className="icon-button h-10 w-10 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Menüyü aç" aria-expanded={mobileNavOpen}><Menu size={20} /></button><div className="app-mobile-brand flex h-8 w-20 items-center overflow-hidden lg:hidden"><DemoWordmark compact /></div><div className="app-workspace-context hidden min-w-0 items-center gap-2 lg:flex"><span className="truncate text-xs font-semibold text-slate-700">{currentUser.workspaceName}</span><span className="h-1 w-1 shrink-0 rounded-full bg-indigo-500" /><span className="whitespace-nowrap text-[11px] text-slate-400">Ortak çalışma alanı</span></div></div>
           <div className="app-account flex min-w-0 items-center gap-2"><div className="hidden min-w-0 text-right sm:block"><p className="truncate text-xs font-semibold text-slate-700">{profile.displayName}</p><p className="max-w-48 truncate text-[10px] text-slate-400">{currentUser.email}</p></div><Avatar name={profile.displayName} initials={profile.displayName.slice(0, 1).toLocaleUpperCase("tr-TR")} src={profile.avatarUrl} className="app-account-avatar" /><span className="app-account-divider" /><SignOutButton /></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
