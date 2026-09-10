"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowRight, LockKeyhole, Mail, Eye, EyeOff, UserRound } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/supabase/auth";
import { BrandMark } from "./brand-mark";

type AuthMode = "sign-in" | "sign-up";
const AUTH_SWITCH_MARKER = "ofus.auth-switch-entry";

function authErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials": return "E-posta veya şifre hatalı.";
    case "user_already_exists":
    case "email_exists": return "Bu e-posta adresiyle daha önce kayıt oluşturulmuş.";
    case "weak_password": return "Şifre yeterince güçlü değil. En az 8 karakter kullanın.";
    case "over_email_send_rate_limit": return "Çok fazla e-posta isteği gönderildi. Lütfen biraz sonra tekrar deneyin.";
    case "signup_disabled": return "Yeni kayıt oluşturma şu anda kapalı.";
    default: return "İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.";
  }
}

export function AuthForm({ mode, initialMessage }: { mode: AuthMode; initialMessage?: string }) {
  const router = useRouter();
  const signingUp = mode === "sign-up";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialMessage ?? "");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [switching, setSwitching] = useState(false);
  const submissionLock = useRef(false);
  const switchLock = useRef(false);
  const [visible, setVisible] = useState(false);
  const authRoot = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const entryMode = useRef<AuthMode | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (entryMode.current === undefined) {
      try {
        const marker = sessionStorage.getItem(AUTH_SWITCH_MARKER);
        entryMode.current = marker === "sign-in" || marker === "sign-up" ? marker : null;
        sessionStorage.removeItem(AUTH_SWITCH_MARKER);
      } catch { entryMode.current = null; }
    }
    if (entryMode.current !== mode) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const form = formRef.current;
    if (!form) return;
    let cancelled = false;
    if (reduced) { form.focus({ preventScroll: true }); return; }
    form.setAttribute("inert", "");
    form.setAttribute("aria-busy", "true");
    const animation = form.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-in-out", fill: "both" });
    void animation.finished.catch(() => undefined).then(() => {
      if (cancelled) return;
      form.removeAttribute("inert");
      form.removeAttribute("aria-busy");
      if (form.isConnected) form.focus({ preventScroll: true });
    });
    return () => {
      cancelled = true;
      animation.cancel();
      form.removeAttribute("inert");
      form.removeAttribute("aria-busy");
    };
  }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionLock.current || switchLock.current || pending) return;
    submissionLock.current = true;
    setError("");
    setSuccess("");
    setPending(true);
    try {
      if (signingUp) {
        const { data, error: authError } = await signUpWithEmail(email.trim(), password, displayName.trim(), `${window.location.origin}/auth/callback`);
        if (authError) return setError(authErrorMessage(authError.code));
        if (!data.session) {
          setSuccess("Kaydınız oluşturuldu. E-postanızdaki doğrulama bağlantısını açtıktan sonra giriş yapın.");
          return;
        }
      } else {
        const { error: authError } = await signInWithEmail(email.trim(), password);
        if (authError) return setError(authErrorMessage(authError.code));
      }
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && authRoot.current) {
        const root = authRoot.current;
        const layers = root.querySelectorAll(".ofus-auth-column > *, .ofus-auth-hero > div");
        const transitions = [...layers].map((layer) => layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" }));
        await Promise.all(transitions.map((animation) => animation.finished.catch(() => undefined)));
        const wipe = root.querySelector(".ofus-auth-wipe");
        if (wipe) {
          const wipeAnimation = wipe.animate([{ transform: `scaleX(${window.innerWidth <= 760 ? 1 : 1 / 3})` }, { transform: "scaleX(1)" }], { duration: window.innerWidth <= 760 ? 0 : 600, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
          transitions.push(wipeAnimation);
          await wipeAnimation.finished.catch(() => undefined);
        }
        try { sessionStorage.setItem("ofus.workspace-entry", String(Date.now())); } catch { /* Optional entry animation. */ }
        window.setTimeout(() => {
          if (!root.isConnected) return;
          transitions.forEach((animation) => animation.cancel());
          try { sessionStorage.removeItem("ofus.workspace-entry"); } catch { /* Optional marker. */ }
        }, 2500);
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Kimlik doğrulama servisine ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      submissionLock.current = false;
      setPending(false);
    }
  };

  const switchMode = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (switchLock.current || submissionLock.current) return;
    switchLock.current = true;
    setSwitching(true);
    const targetMode: AuthMode = signingUp ? "sign-in" : "sign-up";
    const targetHref = signingUp ? "/giris" : "/kayit";
    const form = formRef.current;
    form?.setAttribute("inert", "");
    form?.setAttribute("aria-busy", "true");
    let fade: Animation | null = null;
    try {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches && form) {
        fade = form.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in-out", fill: "forwards" });
        await fade.finished.catch(() => undefined);
      }
      try { sessionStorage.setItem(AUTH_SWITCH_MARKER, targetMode); } catch { /* Optional entry animation. */ }
      router.push(targetHref);
      window.setTimeout(() => {
        if (formRef.current !== form || !form?.isConnected) return;
        fade?.cancel();
        form.removeAttribute("inert");
        form.removeAttribute("aria-busy");
        switchLock.current = false;
        setSwitching(false);
        try { if (sessionStorage.getItem(AUTH_SWITCH_MARKER) === targetMode) sessionStorage.removeItem(AUTH_SWITCH_MARKER); } catch { /* Optional marker. */ }
      }, 2000);
    } catch {
      fade?.cancel();
      switchLock.current = false;
      setSwitching(false);
      form?.removeAttribute("inert");
      form?.removeAttribute("aria-busy");
    }
  };

  return <main ref={authRoot} className="ofus-auth">
    <div className="ofus-auth-column">
      <BrandMark />
      <form ref={formRef} tabIndex={-1} onSubmit={submit} className="ofus-auth-form">
        <h1>{signingUp ? "Kayıt ol" : "Giriş yap"}</h1>
        <p>{signingUp ? "Birlikte çalışmaya başla." : "Ortak çalışma alanına devam et."}</p>
        {signingUp ? <label className="ofus-auth-field">Ad soyad<span className="ofus-auth-input"><UserRound size={22} /><input required autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Adın ve soyadın" /></span></label> : null}
        <label className="ofus-auth-field">E-posta<span className="ofus-auth-input"><Mail size={22} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@eposta.com" /></span></label>
        <label className="ofus-auth-field">Şifre<span className="ofus-auth-input"><LockKeyhole size={22} /><input required minLength={8} type={visible ? "text" : "password"} autoComplete={signingUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={signingUp ? "En az 8 karakter" : "Şifreni gir"} /><button type="button" className="icon-button shrink-0" onClick={() => setVisible(!visible)} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}>{visible ? <EyeOff size={22} /> : <Eye size={22} />}</button></span></label>
        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {success ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
        <button disabled={pending || switching} type="submit" className="primary-button">{pending ? "Lütfen bekleyin…" : signingUp ? "Kayıt Ol" : "Giriş Yap"}{!pending ? <ArrowRight size={22} /> : null}</button>
        <div className="mt-7 text-center text-sm text-slate-500">{signingUp ? "Zaten hesabın var mı?" : "Henüz hesabın yok mu?"} <Link aria-disabled={switching} className="font-medium text-indigo-600" href={signingUp ? "/giris" : "/kayit"} onClick={switchMode}>{signingUp ? "Giriş yap" : "Kayıt ol"}</Link></div>
      </form>
      <p className="ofus-auth-footer">OfUs · Ortak çalışma alanı</p>
    </div>
    <aside className="ofus-auth-hero"><div><BrandMark /><p>Birlikte çalışmanın en net hali.</p></div></aside>
    <div className="ofus-auth-wipe" aria-hidden="true" />
  </main>;
}
