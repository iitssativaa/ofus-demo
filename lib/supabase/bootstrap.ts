import { createClient } from "./server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getPrimaryWorkspaceId() {
  const workspaceId = process.env.PRIMARY_WORKSPACE_ID?.trim();
  if (!workspaceId || !UUID_PATTERN.test(workspaceId)) {
    throw new Error("PRIMARY_WORKSPACE_ID is not configured with a valid UUID.");
  }
  return workspaceId;
}

export type AuthenticatedWorkspace = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  workspaceId: string;
  workspaceName: string;
};

export async function ensureAuthenticatedWorkspace(): Promise<AuthenticatedWorkspace | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const fallbackName = typeof user.user_metadata.display_name === "string" && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : user.email?.split("@")[0] || "Kullanıcı";

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile && !profileError) {
    const created = await supabase.from("profiles").insert({ id: user.id, display_name: fallbackName }).select("display_name, avatar_url").single();
    if (created.error?.code === "23505") {
      const existing = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single();
      profile = existing.data;
      profileError = existing.error;
    } else {
      profile = created.data;
      profileError = created.error;
    }
  }
  if (profileError) throw new Error(`Profile bootstrap failed: ${profileError.message}`);

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_primary_workspace_membership", {
    configured_primary_workspace_id: getPrimaryWorkspaceId(),
  });
  if (workspaceError || !workspaceId) throw new Error(`Workspace bootstrap failed: ${workspaceError?.message ?? "workspace missing"}`);

  const [{ data: workspace, error: workspaceReadError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("workspaces").select("id, name").eq("id", workspaceId).single(),
    supabase.from("workspace_members").select("workspace_id, role").eq("workspace_id", workspaceId).eq("user_id", user.id).single(),
  ]);

  if (workspaceReadError || membershipError || !workspace || !membership) {
    throw new Error(`Workspace verification failed: ${workspaceReadError?.message ?? membershipError?.message ?? "membership missing"}`);
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? fallbackName,
    avatarUrl: profile?.avatar_url ?? null,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}
