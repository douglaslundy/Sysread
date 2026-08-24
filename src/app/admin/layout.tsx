import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getPlatformSettings()]);
  if (!user) redirect("/?auth=login");
  if (user.role !== "admin") redirect("/");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/admin">{settings.platformName}</Link>
        <p>Área Administrativa</p>
        <nav aria-label="Navegação administrativa">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/users">Usuários</Link>
          <Link href="/admin/contents">Conteúdos</Link>
          <Link href="/admin/settings">Configurações</Link>
        </nav>
        <Link className="ui-button ui-button-secondary ui-button-medium" href="/">Voltar para a plataforma</Link>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
