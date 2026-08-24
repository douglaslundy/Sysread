import { getAdminSettings } from "@/modules/admin/application/platform-settings";
import { AdminSettings } from "@/modules/admin/ui/admin-settings";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  return <AdminSettings initialSettings={settings} />;
}
