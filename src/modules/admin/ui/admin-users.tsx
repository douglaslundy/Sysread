"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";

export type AdminUserRow = { accessExpiresAt?: string; createdAt: string; email: string; id: string; lastLoginAt?: string; name: string; role: "admin" | "user"; status: string };

export function AdminUsers({ currentUserId, initialUsers }: { currentUserId: string; initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  async function load(event?: FormEvent) { event?.preventDefault(); setError(""); const params = new URLSearchParams(); if (search) params.set("search", search); if (filter) params.set("status", filter); const response = await fetch("/api/admin/users?" + params); if (!response.ok) { setError("Não foi possível carregar os usuários."); return; } setUsers(((await response.json()) as { users: AdminUserRow[] }).users); }
  async function update(user: AdminUserRow, body: Record<string, unknown>) {
    setBusy(user.id); setError("");
    try { const response = await fetch("/api/admin/users/" + user.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o usuário."); }
    finally { setBusy(""); }
  }
  return <section>
    <header className="admin-page-header"><div><p>Contas e acesso</p><h1>Usuários</h1></div></header>
    <form className="admin-filters" onSubmit={load}><label><span>Pesquisar</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou e-mail" value={search} /></label><label><span>Status</span><select onChange={(event) => setFilter(event.target.value)} value={filter}><option value="">Todos</option><option value="active">Ativos</option><option value="blocked">Bloqueados</option><option value="expired">Expirados</option></select></label><Button type="submit">Buscar</Button></form>
    {error ? <p className="admin-error" role="alert">{error}</p> : null}
    <div className="admin-table-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Expiração</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.role === "admin" ? "Administrador" : "Usuário"}</td><td><span className={`status-pill status-${user.status}`}>{user.status}</span></td><td><input aria-label={`Expiração de ${user.name}`} defaultValue={user.accessExpiresAt?.slice(0, 16) ?? ""} disabled={busy === user.id} onBlur={(event) => void update(user, { accessExpiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })} type="datetime-local" /></td><td>{user.status === "blocked" ? <Button disabled={busy === user.id} onClick={() => void update(user, { status: "active" })} size="small">Desbloquear</Button> : <Button disabled={busy === user.id || user.id === currentUserId} onClick={() => { if (confirm(`Bloquear ${user.name}?`)) void update(user, { status: "blocked" }); }} size="small" variant="danger">Bloquear</Button>}</td></tr>)}</tbody></table></div>
  </section>;
}
