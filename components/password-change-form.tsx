"use client";

import { useRef, useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { changePassword } from "@/lib/supabase/auth";

const minimumPasswordLength = 8;

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const submissionLock = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLock.current || pending) return;
    setFeedback(null);

    if (!currentPassword || !newPassword || !newPasswordAgain) {
      setFeedback({ kind: "error", text: "Tüm şifre alanlarını doldurun." });
      return;
    }
    if (newPassword.length < minimumPasswordLength) {
      setFeedback({ kind: "error", text: `Yeni şifreniz en az ${minimumPasswordLength} karakter olmalıdır.` });
      return;
    }
    if (newPassword !== newPasswordAgain) {
      setFeedback({ kind: "error", text: "Yeni şifreler birbiriyle eşleşmiyor." });
      return;
    }
    if (newPassword === currentPassword) {
      setFeedback({ kind: "error", text: "Yeni şifreniz mevcut şifrenizden farklı olmalıdır." });
      return;
    }

    submissionLock.current = true;
    setPending(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordAgain("");
      setFeedback({
        kind: "success",
        text: result.otherSessionsClosed
          ? "Şifreniz güncellendi. Diğer aktif oturumlar kapatıldı."
          : "Şifreniz güncellendi. Güvenlik için diğer cihazlarda yeniden giriş yapın.",
      });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Şifreniz güncellenemedi." });
    } finally {
      submissionLock.current = false;
      setPending(false);
    }
  };

  return <section className="panel p-5 sm:p-6">
    <div className="flex items-center gap-2"><LockKeyhole size={17} className="text-amber-500" /><h2 className="section-title">Güvenlik</h2></div>
    <h3 className="mt-4 text-sm font-semibold text-slate-800">Şifre Değiştir</h3>
    <p className="mt-1 text-xs leading-5 text-slate-400">Şifrenizi güncellemeden önce mevcut şifreniz doğrulanır.</p>
    <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
      <label className="field-label">Mevcut Şifre<input required type="password" autoComplete="current-password" className="input" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setFeedback(null); }} /></label>
      <label className="field-label">Yeni Şifre<input required minLength={minimumPasswordLength} type="password" autoComplete="new-password" className="input" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setFeedback(null); }} placeholder="En az 8 karakter" /></label>
      <label className="field-label">Yeni Şifre Tekrar<input required minLength={minimumPasswordLength} type="password" autoComplete="new-password" className="input" value={newPasswordAgain} onChange={(event) => { setNewPasswordAgain(event.target.value); setFeedback(null); }} /></label>
      {feedback ? <p role={feedback.kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2.5 text-xs leading-5 ${feedback.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.text}</p> : null}
      <button type="submit" disabled={pending} className="primary-button w-full disabled:cursor-wait disabled:opacity-60">{pending ? "Güncelleniyor…" : "Şifreyi Güncelle"}</button>
    </form>
  </section>;
}
