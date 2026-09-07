import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { createClient } from "./server";
import type { Database } from "./database.types";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export type SettingsMember = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
  isCurrentUser: boolean;
};

export type SettingsData = {
  currentUserId: string;
  workspaceName: string;
  members: SettingsMember[];
  telegram: TelegramConnection;
};

export type TelegramConnection = {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
};

export async function getSettingsData(): Promise<SettingsData> {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", identity.workspaceId)
    .order("joined_at");
  if (membershipError) throw membershipError;

  const memberIds = memberships.map((membership) => membership.user_id);
  const [{ data: profiles, error: profileError }, { data: telegramRows, error: telegramError }] = await Promise.all([
    memberIds.length
      ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.rpc("get_own_telegram_connection"),
  ]);
  if (profileError || telegramError) throw profileError ?? telegramError;
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const telegram = telegramRows?.[0];

  return {
    currentUserId: identity.userId,
    workspaceName: identity.workspaceName,
    telegram: {
      connected: telegram?.connected ?? false,
      username: telegram?.username ?? null,
      connectedAt: telegram?.connected_at ?? null,
    },
    members: memberships.map((membership) => {
      const profile = profilesById.get(membership.user_id);
      return {
        id: membership.user_id,
        displayName: profile?.display_name ?? null,
        email: membership.user_id === identity.userId ? identity.email || null : null,
        avatarUrl: profile?.avatar_url ?? null,
        role: membership.role,
        joinedAt: membership.joined_at,
        isCurrentUser: membership.user_id === identity.userId,
      };
    }),
  };
}
