"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/supabase/auth";

export function SignOutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const submissionLock = useRef(false);

  const handleSignOut = async () => {
    if (submissionLock.current || pending) return;
    submissionLock.current = true;
    setPending(true);
    setError(false);
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) {
        setError(true);
        return;
      }
      router.replace("/giris");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      submissionLock.current = false;
      setPending(false);
    }
  };

  return <div className={full ? "space-y-2" : "relative"}><button disabled={pending} onClick={handleSignOut} className={full ? "secondary-button w-full" : "icon-button"} aria-label="Çıkış Yap" title={error ? "Çıkış yapılamadı. Lütfen tekrar deneyin." : "Çıkış Yap"}><LogOut size={16} />{full ? pending ? "Çıkış yapılıyor…" : "Çıkış Yap" : null}</button>{full && error ? <p className="text-xs text-rose-600">Çıkış yapılamadı. Lütfen tekrar deneyin.</p> : null}</div>;
}
