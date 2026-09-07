"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/supabase/auth";
import { BrandMark } from "./brand-mark";

type AuthMode = "sign-in" | "sign-up";

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
  const submissionLock = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionLock.current || pending) return;
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
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Kimlik doğrulama servisine ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      submissionLock.current = false;
      setPending(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-background p-4">
    <div className="w-full max-w-md">
      <div className="mb-6 text-center"><div className="flex h-12 items-center justify-center"><BrandMark className="text-4xl" /></div><p className="mt-2 text-sm text-slate-500">Ortak çalışma alanınıza güvenle devam edin.</p></div>
      <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/[0.05]">
        <div className="border-b border-slate-100 px-6 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><LockKeyhole size={19} /></span><div><h1 className="text-lg font-semibold text-slate-950">{signingUp ? "Kayıt Ol" : "Giriş Yap"}</h1><p className="text-xs text-slate-400">{signingUp ? "Yeni hesabınızı oluşturun." : "Hesabınızla çalışma alanına girin."}</p></div></div></div>
        <div className="space-y-4 p-6">
          {signingUp ? <label className="field-label">Ad Soyad<input required autoComplete="name" className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Adınız ve soyadınız" /></label> : null}
          <label className="field-label">E-posta<input required type="email" autoComplete="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@eposta.com" /></label>
          <label className="field-label">Şifre<input required minLength={8} type="password" autoComplete={signingUp ? "new-password" : "current-password"} className="input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 8 karakter" /></label>
          {error ? <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-700">{success}</p> : null}
          <button disabled={pending} type="submit" className="primary-button h-10 w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Lütfen bekleyin…" : signingUp ? "Kayıt Ol" : "Giriş Yap"}{!pending ? <ArrowRight size={15} /> : null}</button>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center text-xs text-slate-500">{signingUp ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"} <Link className="font-semibold text-indigo-700 hover:text-indigo-900" href={signingUp ? "/giris" : "/kayit"}>{signingUp ? "Giriş Yap" : "Kayıt Ol"}</Link></div>
      </form>
    </div>
  </main>;
}
