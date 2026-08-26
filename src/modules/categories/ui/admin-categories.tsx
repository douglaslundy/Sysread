"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import type { CategoryRow } from "../application/category-service";

type Draft = { active: boolean; name: string; order: number };
const emptyDraft: Draft = { active: true, name: "", order: 0 };

export function AdminCategories({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [status, setStatus] = useState("");

  async function reload() {
    const response = await fetch("/api/admin/categories");
    if (response.ok) setCategories(((await response.json()) as { categories: CategoryRow[] }).categories);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setStatus("Salvando…");
    const response = await fetch("/api/admin/categories", {
      body: JSON.stringify(draft), headers: { "content-type": "application/json" }, method: "POST",
    });
    const body = await response.json();
    if (!response.ok) { setStatus(body?.error?.message ?? "Não foi possível cadastrar a categoria."); return; }
    setDraft(emptyDraft);
    setStatus("Categoria cadastrada.");
    await reload();
  }

  async function save(id: string) {
    setStatus("Salvando…");
    const response = await fetch("/api/admin/categories/" + id, {
      body: JSON.stringify(editDraft), headers: { "content-type": "application/json" }, method: "PATCH",
    });
    const body = await response.json();
    if (!response.ok) { setStatus(body?.error?.message ?? "Não foi possível atualizar a categoria."); return; }
    setEditing(null);
    setStatus("Categoria atualizada.");
    await reload();
  }

  async function remove(category: CategoryRow) {
    if (!confirm(`Excluir a categoria “${category.name}”?`)) return;
    const response = await fetch("/api/admin/categories/" + category.id, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) { setStatus(body?.error?.message ?? "Não foi possível excluir a categoria."); return; }
    setStatus("Categoria excluída.");
    await reload();
  }

  function startEditing(category: CategoryRow) {
    setEditing(category.id);
    setEditDraft({ active: category.active, name: category.name, order: category.order });
  }

  return (
    <section>
      <header className="admin-page-header"><div><p>Organização da biblioteca</p><h1>Categorias</h1></div></header>
      <form className="admin-form admin-panel" onSubmit={create}>
        <h2>Nova categoria</h2>
        <label><span>Nome</span><input maxLength={80} minLength={2} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} required value={draft.name} /></label>
        <label><span>Ordem de exibição</span><input min={0} onChange={(event) => setDraft((value) => ({ ...value, order: Number(event.target.value) }))} required type="number" value={draft.order} /></label>
        <label className="admin-check"><input checked={draft.active} onChange={(event) => setDraft((value) => ({ ...value, active: event.target.checked }))} type="checkbox" /> Disponível para importação</label>
        <Button type="submit">Cadastrar categoria</Button>
      </form>
      <p aria-live="polite">{status}</p>
      <div className="admin-category-list">
        {categories.map((category) => editing === category.id ? (
          <form className="admin-panel admin-category-row" key={category.id} onSubmit={(event) => { event.preventDefault(); void save(category.id); }}>
            <input aria-label="Nome" maxLength={80} minLength={2} onChange={(event) => setEditDraft((value) => ({ ...value, name: event.target.value }))} required value={editDraft.name} />
            <input aria-label="Ordem de exibição" min={0} onChange={(event) => setEditDraft((value) => ({ ...value, order: Number(event.target.value) }))} required type="number" value={editDraft.order} />
            <label className="admin-check"><input checked={editDraft.active} onChange={(event) => setEditDraft((value) => ({ ...value, active: event.target.checked }))} type="checkbox" /> Ativa</label>
            <div><Button size="small" type="submit">Salvar</Button><Button onClick={() => setEditing(null)} size="small" type="button" variant="secondary">Cancelar</Button></div>
          </form>
        ) : (
          <article className="admin-panel admin-category-row" key={category.id}>
            <div><span className={`status-pill ${category.active ? "status-active" : "status-blocked"}`}>{category.active ? "Ativa" : "Inativa"}</span><h2>{category.name}</h2><small>Ordem {category.order}</small></div>
            <div><Button onClick={() => startEditing(category)} size="small" variant="secondary">Editar</Button><Button onClick={() => void remove(category)} size="small" variant="danger">Excluir</Button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
