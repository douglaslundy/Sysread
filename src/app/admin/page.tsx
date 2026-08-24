import { getAdminDashboard } from "@/modules/admin/application/admin-service";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();
  const cards = [
    ["Total de usuários", dashboard.metrics.totalUsers], ["Usuários ativos", dashboard.metrics.activeUsers],
    ["Usuários bloqueados", dashboard.metrics.blockedUsers], ["Novos em 30 dias", dashboard.metrics.newUsers],
    ["Acesso expirado", dashboard.metrics.expiredUsers], ["Expiram em 7 dias", dashboard.metrics.expiringUsers],
    ["Total de conteúdos", dashboard.metrics.totalContents], ["Conteúdos públicos", dashboard.metrics.publicContents],
    ["Conteúdos privados", dashboard.metrics.privateContents], ["Leituras registradas", dashboard.metrics.totalReadings],
  ] as const;
  const maxRegistrations = Math.max(1, ...dashboard.registrations.map((item) => item.count));
  return (
    <section>
      <header className="admin-page-header"><div><p>Visão geral</p><h1>Dashboard</h1></div></header>
      <div className="admin-metrics">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="admin-columns">
        <section className="admin-panel"><h2>Evolução de cadastros</h2>
          {dashboard.registrations.length ? <div className="admin-chart" aria-label="Cadastros nos últimos 30 dias">{dashboard.registrations.map((item) => <div key={item.date} title={`${item.date}: ${item.count}`}><span style={{ height: `${Math.max(8, item.count / maxRegistrations * 100)}%` }} /><small>{item.date.slice(5)}</small></div>)}</div> : <p>Nenhum cadastro no período.</p>}
        </section>
        <section className="admin-panel"><h2>Conteúdos mais acessados</h2><ol>{dashboard.mostAccessed.map((item) => <li key={item.title}><span>{item.title}</span><strong>{item.count}</strong></li>)}</ol>{!dashboard.mostAccessed.length ? <p>Nenhuma leitura registrada.</p> : null}</section>
        <section className="admin-panel"><h2>Atividade recente</h2><ul>{dashboard.recentUsers.map((user) => <li key={user.email}><span>{user.name}<small>{user.email}</small></span><time>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : "—"}</time></li>)}</ul>{!dashboard.recentUsers.length ? <p>Nenhuma atividade registrada.</p> : null}</section>
      </div>
    </section>
  );
}
