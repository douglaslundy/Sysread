import { listAdminContents, listAdminUsers } from "@/modules/admin/application/admin-service";
import { AdminContents } from "@/modules/admin/ui/admin-contents";

export default async function AdminContentsPage() {
  const [contents, users] = await Promise.all([listAdminContents(), listAdminUsers({ status: "active" })]);
  return <AdminContents initialContents={contents} users={users} />;
}
