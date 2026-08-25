"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PublicationRequestRow } from "../application/publication-service";

export function AdminPublicationRequests({ initialRequests }: { initialRequests: PublicationRequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  async function decide(id: string, decision: "approved" | "rejected") {
    const justification = justifications[id]?.trim() ?? "";
    if (justification.length < 5) {
      setStatus("Informe uma justificativa com pelo menos 5 caracteres.");
      return;
    }
    setBusy(id);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/publication-requests/${encodeURIComponent(id)}`, {
        body: JSON.stringify({ decision, justification }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("DECISION_FAILED");
      setRequests((current) => current.map((item) => item.id === id ? {
        ...item,
        decidedAt: new Date().toISOString(),
        justification,
        status: decision,
      } : item));
      setStatus(decision === "approved" ? "Publicação aprovada." : "Publicação recusada.");
    } catch {
      setStatus("Não foi possível registrar a decisão.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <header className="admin-heading"><div><p>Moderação</p><h1>Aprovações de livros públicos</h1><small>Analise os conteúdos enviados pelos leitores. Toda decisão exige uma justificativa.</small></div></header>
      <p aria-live="polite">{status}</p>
      <div className="admin-publication-list">
        {requests.length === 0 ? <div className="admin-panel"><p>Nenhum envio para exibir.</p></div> : requests.map((request) => (
          <article className="admin-panel admin-publication-card" key={request.id}>
            <div>
              <span className={`status-pill status-${request.status}`}>{request.status === "pending" ? "Pendente" : request.status === "approved" ? "Aprovado" : "Recusado"}</span>
              <h2>{request.title}</h2>
              <p>{request.requesterName || "Usuário"} · {request.requesterEmail || "E-mail indisponível"}</p>
              <small>{request.sourceType} · processamento: {request.processingStatus} · enviado em {new Date(request.requestedAt).toLocaleString("pt-BR")}</small>
            </div>
            {request.status === "pending" ? (
              <div className="admin-publication-decision">
                <label><span>Justificativa obrigatória</span><textarea maxLength={2000} onChange={(event) => setJustifications((current) => ({ ...current, [request.id]: event.target.value }))} rows={4} value={justifications[request.id] ?? ""} /></label>
                <div><Button disabled={busy === request.id} onClick={() => void decide(request.id, "approved")}>Aprovar</Button><Button disabled={busy === request.id} onClick={() => void decide(request.id, "rejected")} variant="danger">Recusar</Button></div>
              </div>
            ) : <blockquote><strong>Justificativa</strong><p>{request.justification}</p></blockquote>}
          </article>
        ))}
      </div>
    </section>
  );
}
