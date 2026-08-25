import { listAdminPublicationRequests } from "@/modules/publication/application/publication-service";
import { AdminPublicationRequests } from "@/modules/publication/ui/admin-publication-requests";

export default async function AdminPublicationsPage() {
  return <AdminPublicationRequests initialRequests={await listAdminPublicationRequests()} />;
}
