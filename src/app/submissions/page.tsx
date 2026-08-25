import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { listOwnPublicationRequests } from "@/modules/publication/application/publication-service";
import { PublicationHistory } from "@/modules/publication/ui/publication-history";

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login");
  const requests = await listOwnPublicationRequests(user.id);
  return (
    <main className="app-frame">
      <AppHeader active="library" user={{ email: user.emailNormalized, id: user.id, name: user.name, role: user.role, theme: user.theme }} />
      <PublicationHistory requests={requests} />
    </main>
  );
}
