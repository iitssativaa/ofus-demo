"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Building2, Camera, ChevronDown, ExternalLink, MessageCircle, Trash2, UserRound, X } from "lucide-react";
import { emitProfileUpdated } from "@/lib/profile-events";
import type { SettingsData, SettingsMember } from "@/lib/supabase/settings";
import { createTelegramLink, disconnectTelegram, getTelegramConnection, removeOwnAvatar, sendTelegramTestMessage, updateOwnProfile, uploadOwnAvatar, validateAvatarFile } from "@/lib/supabase/settings-client";
import { Avatar } from "./avatar";
import { PasswordChangeForm } from "./password-change-form";
import { PageHeader } from "./page-header";
import { ThemeToggle } from "./theme-toggle";
import { useDialogFocus } from "./use-dialog-focus";
import { toast } from "./toast";

function memberInitials(member: SettingsMember) {
  const name = member.displayName ?? "Ad bilgisi yok";
  return member.displayName
    ? member.displayName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("tr-TR")
    : name.slice(0, 1).toLocaleUpperCase("tr-TR");
}

export function SettingsView({ initialData }: { initialData: SettingsData }) {
  const [members, setMembers] = useState(initialData.members);
  const currentMember = members.find((member) => member.id === initialData.currentUserId) ?? null;
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentMember?.displayName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileLock = useRef(false);
  const avatarLock = useRef(false);
  const telegramLock = useRef(false);
  const [telegram, setTelegram] = useState(initialData.telegram);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [telegramLink, setTelegramLink] = useState<{ botUrl: string; expiresAt: string } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [telegramExpanded, setTelegramExpanded] = useState(false);
  useDialogFocus(editing, () => { if (!profileSaving) setEditing(false); });
  useDialogFocus(Boolean(telegramLink), () => { if (!telegramBusy) setTelegramLink(null); });

  const openEditor = () => {
    if (!currentMember) return;
    setDisplayName(currentMember.displayName ?? "");
    setProfileError("");
    setEditing(true);
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (profileLock.current || profileSaving) return;
    if (!displayName.trim()) return setProfileError("Görünen ad boş bırakılamaz.");
    profileLock.current = true;
    setProfileSaving(true);
    setProfileError("");
    try {
      const profile = await updateOwnProfile(displayName);
      setMembers((current) => current.map((member) => member.id === profile.id ? { ...member, displayName: profile.display_name, avatarUrl: profile.avatar_url } : member));
      emitProfileUpdated({ userId: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url });
      setEditing(false);
      toast.show("profileSaved");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profil kaydedilemedi.");
      toast.show("saveError", { message: "Profil kaydedilemedi" });
    } finally {
      profileLock.current = false;
      setProfileSaving(false);
    }
  };

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      validateAvatarFile(file);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (error) {
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarError(error instanceof Error ? error.message : "Fotoğraf seçilemedi.");
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile || avatarLock.current || avatarBusy) return;
    avatarLock.current = true;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const profile = await uploadOwnAvatar(avatarFile);
      setMembers((current) => current.map((member) => member.id === profile.id ? { ...member, avatarUrl: profile.avatar_url } : member));
      setAvatarFile(null);
      setAvatarPreview(null);
      emitProfileUpdated({ userId: profile.id, avatarUrl: profile.avatar_url });
      toast.show("fileUploaded", { message: "Profil fotoğrafı kaydedildi" });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Profil fotoğrafı kaydedilemedi.");
      toast.show("uploadError", { message: "Profil fotoğrafı kaydedilemedi" });
    } finally {
      avatarLock.current = false;
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!currentMember?.avatarUrl || avatarLock.current || avatarBusy) return;
    avatarLock.current = true;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const profile = await removeOwnAvatar();
      setMembers((current) => current.map((member) => member.id === profile.id ? { ...member, avatarUrl: null } : member));
      setAvatarFile(null);
      setAvatarPreview(null);
      emitProfileUpdated({ userId: profile.id, avatarUrl: null });
      toast.show("recordDeleted", { message: "Profil fotoğrafı kaldırıldı" });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Profil fotoğrafı kaldırılamadı.");
      toast.show("saveError", { message: "Profil fotoğrafı kaldırılamadı" });
    } finally {
      avatarLock.current = false;
      setAvatarBusy(false);
    }
  };

  const runTelegramAction = async (action: () => Promise<void>) => {
    if (telegramLock.current || telegramBusy) return;
    telegramLock.current = true;
    setTelegramBusy(true);
    setTelegramFeedback(null);
    try {
      await action();
    } catch (error) {
      setTelegramFeedback({ kind: "error", text: error instanceof Error ? error.message : "Telegram işlemi tamamlanamadı." });
    } finally {
      telegramLock.current = false;
      setTelegramBusy(false);
    }
  };

  const startTelegramLink = () => void runTelegramAction(async () => {
    const link = await createTelegramLink();
    setTelegramLink({ botUrl: link.botUrl, expiresAt: link.expiresAt });
  });

  const checkTelegramLink = () => void runTelegramAction(async () => {
    const connection = await getTelegramConnection();
    setTelegram(connection);
    if (!connection.connected) throw new Error("Bağlantı henüz tamamlanmadı. Telegram'da Başlat düğmesine dokunun.");
    setTelegramLink(null);
    setTelegramFeedback({ kind: "success", text: "Telegram hesabınız bağlandı." });
  });

  useEffect(() => {
    if (!telegramLink) return;
    let active = true;
    let checking = false;
    const refreshOnFocus = async () => {
      if (checking) return;
      checking = true;
      try {
        const connection = await getTelegramConnection();
        if (!active || !connection.connected) return;
        setTelegram(connection);
        setTelegramLink(null);
        setTelegramFeedback({ kind: "success", text: "Telegram hesabınız bağlandı." });
      } catch {
        // Kullanıcı Telegram'da henüz Başlat'a basmadıysa manuel kontrol kullanılabilir.
      } finally {
        checking = false;
      }
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [telegramLink]);

  const testTelegram = () => void runTelegramAction(async () => {
    await sendTelegramTestMessage();
    setTelegramFeedback({ kind: "success", text: "Test mesajı Telegram'a gönderildi." });
  });

  const removeTelegram = () => void runTelegramAction(async () => {
    await disconnectTelegram();
    setTelegram({ connected: false, username: null, connectedAt: null });
    setConfirmDisconnect(false);
    setTelegramFeedback({ kind: "success", text: "Telegram bağlantısı kaldırıldı." });
  });

  return <>
    <PageHeader eyebrow="Çalışma alanı yönetimi" title="Ayarlar" description={`${initialData.workspaceName} profil ve çalışma alanı tercihleri.`} />
    <div className="settings-layout grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="panel settings-profile p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><UserRound size={17} className="text-indigo-600"/><h2 className="section-title flex-1">Profilim</h2><button type="button" onClick={openEditor} className="secondary-button">Profili Düzenle</button></div>
          {currentMember ? <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={currentMember.displayName ?? "Ad bilgisi yok"} initials={memberInitials(currentMember)} src={avatarPreview ?? currentMember.avatarUrl} size="xl" className="ring-4" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-slate-900">{currentMember.displayName ?? "Ad bilgisi yok"}</p>
              {currentMember.email ? <p className="mt-0.5 truncate text-sm text-slate-400">{currentMember.email}</p> : null}
              <p className="mt-2 text-xs leading-5 text-slate-400">JPEG, PNG veya WebP · En fazla 5 MB</p>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} className="sr-only" aria-label="Profil fotoğrafı seç" />
              <div className="mt-4 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:flex-wrap">
                <button type="button" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} className="secondary-button w-full min-[430px]:w-auto"><Camera size={15} />Fotoğrafı Değiştir</button>
                {avatarFile ? <><button type="button" disabled={avatarBusy} onClick={() => void saveAvatar()} className="primary-button w-full min-[430px]:w-auto">{avatarBusy ? "Kaydediliyor…" : "Fotoğrafı Kaydet"}</button><button type="button" disabled={avatarBusy} onClick={() => { setAvatarFile(null); setAvatarPreview(null); setAvatarError(""); }} className="secondary-button w-full min-[430px]:w-auto">İptal</button></> : null}
                {currentMember.avatarUrl && !avatarFile ? <button type="button" disabled={avatarBusy} onClick={() => void removeAvatar()} className="secondary-button w-full text-rose-600 min-[430px]:w-auto"><Trash2 size={15} />{avatarBusy ? "Kaldırılıyor…" : "Fotoğrafı Kaldır"}</button> : null}
              </div>
              {avatarError ? <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">{avatarError}</p> : null}
            </div>
          </div> : <p className="mt-4 text-sm text-rose-600" role="alert">Profil bilgileri yüklenemedi.</p>}
        </section>
        <section className="settings-accordion panel overflow-hidden">
          <button
            type="button"
            className="settings-accordion-trigger flex min-h-14 w-full items-center gap-3 px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-300"
            aria-expanded={telegramExpanded}
            aria-controls="telegram-settings"
            onClick={() => setTelegramExpanded((current) => !current)}
          >
            <MessageCircle size={17} className="shrink-0 text-indigo-600"/>
            <span className="min-w-0 flex-1"><span className="section-title block">Telegram</span><span className="mt-0.5 block truncate text-[11px] text-slate-400">{telegram.connected ? "Bağlı" : "Bağlı değil"}</span></span>
            <ChevronDown size={17} className={`shrink-0 text-slate-400 transition ${telegramExpanded ? "rotate-180" : ""}`} />
          </button>
          <div id="telegram-settings" aria-hidden={!telegramExpanded} inert={!telegramExpanded} className={`grid transition-[grid-template-rows,opacity] duration-200 ${telegramExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden"><div className="border-t border-slate-100 p-5 pt-4">
          <p className="text-xs leading-5 text-slate-400">Görev hatırlatmalarını Telegram üzerinden alın.</p>
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-slate-50 p-2 text-slate-500"><MessageCircle size={15} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">Telegram</span>{telegram.username ? <span className="block truncate text-[11px] text-slate-400">@{telegram.username}</span> : null}</span>
              <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${telegram.connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{telegram.connected ? "Bağlı" : "Bağlı değil"}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {telegram.connected ? <>
                <button type="button" disabled={telegramBusy} onClick={testTelegram} className="secondary-button w-full disabled:opacity-60 sm:w-auto">Test Mesajı Gönder</button>
                {!confirmDisconnect ? <button type="button" disabled={telegramBusy} onClick={() => setConfirmDisconnect(true)} className="secondary-button w-full text-rose-600 disabled:opacity-60 sm:w-auto">Bağlantıyı Kaldır</button> : null}
              </> : <button type="button" disabled={telegramBusy} onClick={startTelegramLink} className="primary-button w-full disabled:opacity-60 sm:w-auto">{telegramBusy ? "Hazırlanıyor…" : "Telegram'ı Bağla"}</button>}
            </div>
            {confirmDisconnect ? <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"><p>Telegram bağlantısı kaldırılsın mı?</p><div className="mt-2 grid grid-cols-2 gap-2 sm:flex"><button type="button" disabled={telegramBusy} onClick={removeTelegram} className="secondary-button text-rose-600 disabled:opacity-60">Kaldır</button><button type="button" disabled={telegramBusy} onClick={() => setConfirmDisconnect(false)} className="secondary-button">İptal</button></div></div> : null}
            {telegramFeedback ? <p className={`mt-3 text-xs font-semibold ${telegramFeedback.kind === "success" ? "text-emerald-600" : "text-rose-600"}`} role={telegramFeedback.kind === "error" ? "alert" : "status"}>{telegramFeedback.text}</p> : null}
          </div>
          </div></div>
          </div>
        </section>
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><Building2 size={17} className="text-indigo-600"/><h2 className="section-title">Kişiler</h2></div>
          <div className="mt-5 divide-y divide-slate-100">
            {members.length ? members.map((member) => <div key={member.id} className="settings-member-row flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0 min-[430px]:flex-nowrap">
              <Avatar name={member.displayName ?? "Ad bilgisi yok"} initials={memberInitials(member)} src={member.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{member.displayName ?? "Ad bilgisi yok"}</p>
                {member.email ? <p className="truncate text-xs text-slate-400">{member.email}</p> : null}
                <p className="mt-0.5 text-[11px] text-slate-400">{member.role === "owner" ? "Çalışma alanı sahibi" : "Çalışma alanı üyesi"}</p>
              </div>
              {member.isCurrentUser ? <span className="badge bg-indigo-50">Siz</span> : null}
            </div>) : <p className="py-4 text-sm text-slate-400">Çalışma alanı üyesi bulunamadı.</p>}
          </div>
        </section>
        <section className="panel p-5 sm:p-6">
          <h2 className="section-title">Çalışma Alanı</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="field-label">Çalışma alanı adı</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{initialData.workspaceName}</dd></div>
            <div><dt className="field-label">Üye sayısı</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{members.length}</dd></div>
          </dl>
        </section>
      </div>
      <div className="space-y-6">
        <PasswordChangeForm /><ThemeToggle />

      </div>
    </div>

    {editing ? <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
      <button type="button" className="absolute inset-0" onClick={() => !profileSaving && setEditing(false)} aria-label="Profil düzenleme penceresini kapat" />
      <form onSubmit={saveProfile} className="responsive-dialog-panel max-w-md">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><UserRound size={17} /></span><h2 id="profile-edit-title" className="text-sm font-semibold text-slate-950">Profili Düzenle</h2></div><button type="button" disabled={profileSaving} onClick={() => setEditing(false)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
        <div className="p-5"><label className="field-label">Görünen ad<input className="input" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setProfileError(""); }} aria-invalid={Boolean(profileError)} /></label>{profileError ? <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">{profileError}</p> : null}</div>
        <footer className="responsive-dialog-footer"><button type="button" disabled={profileSaving} onClick={() => setEditing(false)} className="secondary-button">İptal</button><button type="submit" disabled={profileSaving} className="primary-button disabled:opacity-60">{profileSaving ? "Kaydediliyor…" : "Kaydet"}</button></footer>
      </form>
    </div> : null}

    {telegramLink ? <div className="responsive-dialog z-[80]" role="dialog" aria-modal="true" aria-labelledby="telegram-link-title">
      <button type="button" className="absolute inset-0" onClick={() => !telegramBusy && setTelegramLink(null)} aria-label="Telegram bağlantı penceresini kapat" />
      <div className="responsive-dialog-panel max-w-md">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><MessageCircle size={17} /></span><h2 id="telegram-link-title" className="text-sm font-semibold text-slate-950">{"Telegram'ı Bağla"}</h2></div><button type="button" disabled={telegramBusy} onClick={() => setTelegramLink(null)} className="icon-button" aria-label="Kapat"><X size={18} /></button></header>
        <div className="space-y-4 p-5 text-sm text-slate-600"><ol className="list-decimal space-y-2 pl-5"><li>{"Telegram'da Aç butonuna basın."}</li><li>{"Telegram'da "}<strong>Başlat</strong> düğmesine dokunun.</li><li>{"OfUs'a geri dönün."}</li></ol><p className="text-xs text-slate-400">Bu tek kullanımlık bağlantı 10 dakika geçerlidir.</p><a href={telegramLink.botUrl} target="_blank" rel="noreferrer" className="primary-button inline-flex items-center gap-2">{"Telegram'da Aç"} <ExternalLink size={14} /></a></div>
        <footer className="responsive-dialog-footer"><button type="button" disabled={telegramBusy} onClick={() => setTelegramLink(null)} className="secondary-button">İptal</button><button type="button" disabled={telegramBusy} onClick={checkTelegramLink} className="primary-button disabled:opacity-60">{telegramBusy ? "Kontrol ediliyor…" : "Bağlantıyı Kontrol Et"}</button></footer>
      </div>
    </div> : null}
  </>;
}

