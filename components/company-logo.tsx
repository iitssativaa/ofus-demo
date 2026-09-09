"use client";

import { Building2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { resolveCompanyLogo } from "@/lib/supabase/company-logos";

export function CompanyLogo({ path, className = "", iconSize = 22 }: { path: string | null; className?: string; iconSize?: number }) {
  const [logo, setLogo] = useState<{ path: string | null; url: string | null }>({ path: null, url: null });

  useEffect(() => {
    let active = true;
    if (!path) return;

    const refresh = () => {
      void resolveCompanyLogo(path).then((url) => {
        if (active) setLogo({ path, url });
      }).catch(() => {
        if (active) setLogo({ path, url: null });
      });
    };
    refresh();
    const refreshTimer = window.setInterval(refresh, 240_000);

    return () => { active = false; window.clearInterval(refreshTimer); };
  }, [path]);

  const url = logo.path === path ? logo.url : null;
  if (!url) return <Building2 size={iconSize} strokeWidth={1.5} aria-hidden="true" />;

  return <Image key={path} src={url} alt="" width={iconSize} height={iconSize} unoptimized className={className} onError={() => setLogo((current) => current.path === path ? { path, url: null } : current)} />;
}
