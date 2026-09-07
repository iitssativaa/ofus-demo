"use client";

import { useEffect, useState } from "react";
import { profileUpdatedEvent, type ProfileUpdatedDetail } from "@/lib/profile-events";
import { useWorkspace } from "./app-provider";
import { Avatar } from "./avatar";

export function UserAvatar({ userId, size = "md", showName = false }: { userId: string; size?: "sm" | "md" | "lg"; showName?: boolean }) {
  const { users } = useWorkspace();
  const user = users.find((item) => item.id === userId);
  const [avatarOverride, setAvatarOverride] = useState<{ userId: string; url: string | null } | null>(null);
  const name = user?.name ?? "Bilinmeyen kullanıcı";
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (detail.userId === userId && "avatarUrl" in detail) setAvatarOverride({ userId, url: detail.avatarUrl ?? null });
    };
    window.addEventListener(profileUpdatedEvent, update);
    return () => window.removeEventListener(profileUpdatedEvent, update);
  }, [userId]);

  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Avatar name={name} initials={user?.initials ?? "?"} src={avatarOverride?.userId === userId ? avatarOverride.url : user?.avatarUrl} size={size} styleColor={user?.color} />
      {showName ? <span className="truncate text-sm font-medium text-slate-700">{user?.firstName ?? "Bilinmeyen"}</span> : null}
    </span>
  );
}
