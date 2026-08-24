import { listAdminUsers } from "@/modules/admin/application/admin-service";
import { AdminUsers } from "@/modules/admin/ui/admin-users";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([listAdminUsers({}), getCurrentUser()]);
  return <AdminUsers currentUserId={currentUser!.id} initialUsers={users} />;
}
