import { SettingsView } from "@/components/settings-view";
import { getSettingsData } from "@/lib/supabase/settings";

export default async function SettingsPage() {
  const data = await getSettingsData();
  return <SettingsView initialData={data} />;
}
