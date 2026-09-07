import { redirect } from "next/navigation";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { BootstrapError } from "@/components/bootstrap-error";
import { ensureAuthenticatedWorkspace } from "@/lib/supabase/bootstrap";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let identity;
  try {
    identity = await ensureAuthenticatedWorkspace();
  } catch (error) {
    console.error("Authenticated workspace bootstrap failed", error);
    return <BootstrapError />;
  }
  if (!identity) redirect("/giris");

  return <AppProvider><AppShell currentUser={identity}>{children}</AppShell></AppProvider>;
}
