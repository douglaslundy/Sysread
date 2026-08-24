"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { AdminPlatformSettings } from "../application/platform-settings";

type Draft = AdminPlatformSettings & {
  ai: AdminPlatformSettings["ai"] & { apiKey: string; clearApiKey: boolean };
  alerts: AdminPlatformSettings["alerts"] & { secret: string; clearSecret: boolean };
  mercadoPago: AdminPlatformSettings["mercadoPago"] & {
    accessToken: string; clearAccessToken: boolean; clearWebhookSecret: boolean; webhookSecret: string;
  };
};

function draftFrom(settings: AdminPlatformSettings): Draft {
  return {
    ...settings,
    ai: { ...settings.ai, apiKey: "", clearApiKey: false },
    alerts: { ...settings.alerts, clearSecret: false, secret: "" },
    mercadoPago: { ...settings.mercadoPago, accessToken: "", clearAccessToken: false, clearWebhookSecret: false, webhookSecret: "" },
  };
}

function SecretState({ configured }: { configured: boolean }) {
  return <span className={`status-pill status-${configured ? "active" : "blocked"}`}>{configured ? "Configurado" : "Não configurado"}</span>;
}

export function AdminSettings({ initialSettings }: { initialSettings: AdminPlatformSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => draftFrom(initialSettings));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const identity = <K extends keyof Pick<Draft, "platformName" | "publicUrl" | "tlsMode">>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent) {
    event.preventDefault(); setStatus("saving");
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
      ai: { apiKey: draft.ai.apiKey || undefined, clearApiKey: draft.ai.clearApiKey, model: draft.ai.model, provider: draft.ai.provider },
      alerts: { clearSecret: draft.alerts.clearSecret, secret: draft.alerts.secret || undefined, timeoutMs: draft.alerts.timeoutMs, url: draft.alerts.url },
      legal: draft.legal,
      mercadoPago: { accessToken: draft.mercadoPago.accessToken || undefined, annualPlanId: draft.mercadoPago.annualPlanId, clearAccessToken: draft.mercadoPago.clearAccessToken, clearWebhookSecret: draft.mercadoPago.clearWebhookSecret, webhookSecret: draft.mercadoPago.webhookSecret || undefined, weeklyPlanId: draft.mercadoPago.weeklyPlanId },
      platformName: draft.platformName, publicUrl: draft.publicUrl, tlsMode: draft.tlsMode,
    }) });
    if (!response.ok) { setStatus("error"); return; }
    const body = await response.json() as { settings: AdminPlatformSettings };
    setDraft(draftFrom(body.settings)); setStatus("saved"); router.refresh();
  }

  async function testIntegration(target: "ai" | "alerts" | "mercadopago") {
    setTestStatus((current) => ({ ...current, [target]: "Testando…" }));
    const response = await fetch("/api/admin/settings/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) });
    setTestStatus((current) => ({ ...current, [target]: response.ok ? "Conexão confirmada." : "Falha no teste. Salve e revise a configuração." }));
  }

  const readiness = [
    ["Domínio e TLS", draft.publicUrl.startsWith("https://") && draft.tlsMode === "external"],
    ["Mercado Pago", draft.mercadoPago.accessTokenConfigured && draft.mercadoPago.webhookSecretConfigured && Boolean(draft.mercadoPago.annualPlanId) && Boolean(draft.mercadoPago.weeklyPlanId)],
    ["Inteligência artificial", draft.ai.apiKeyConfigured && Boolean(draft.ai.model)],
    ["Alertas", Boolean(draft.alerts.url)],
    ["Documentos jurídicos", Boolean(draft.legal.privacyText && draft.legal.termsText && !draft.legal.operatorName.includes("REPLACE:"))],
  ] as const;

  return <section>
    <header className="admin-page-header"><div><p>Operação centralizada</p><h1>Configurações</h1></div></header>
    <form className="admin-settings-form" onSubmit={save}>
      <section className="admin-panel admin-readiness"><div><h2>Prontidão para produção</h2><p>Complete os cinco grupos antes de apontar o tráfego público.</p></div><ul>{readiness.map(([label, ready]) => <li key={label}><span>{label}</span><SecretState configured={ready} /></li>)}</ul></section>
      <section className="admin-panel admin-settings-section">
        <div><h2>Identidade, domínio e TLS</h2><p>Endereço público usado nos retornos de checkout e integrações. O certificado TLS é terminado pelo proxy ou hospedagem.</p></div>
        <div className="admin-form-grid">
          <label><span>Nome da plataforma</span><input maxLength={80} minLength={2} onChange={(e) => identity("platformName", e.target.value)} required value={draft.platformName} /></label>
          <label><span>URL pública</span><input onChange={(e) => identity("publicUrl", e.target.value)} required type="url" value={draft.publicUrl} /></label>
          <label><span>Modo TLS</span><select onChange={(e) => identity("tlsMode", e.target.value as Draft["tlsMode"])} value={draft.tlsMode}><option value="external">HTTPS no proxy/hospedagem</option><option value="disabled">HTTP — somente teste local</option></select></label>
        </div>
        {draft.tlsMode === "external" && !draft.publicUrl.startsWith("https://") ? <p className="admin-warning">Para TLS externo, use uma URL iniciada por https://.</p> : null}
      </section>

      <section className="admin-panel admin-settings-section">
        <div><h2>Mercado Pago</h2><p>Os segredos são criptografados no banco e nunca são exibidos novamente.</p></div>
        <div className="admin-form-grid">
          <label><span>Plano anual</span><input onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, annualPlanId: e.target.value } }))} value={draft.mercadoPago.annualPlanId} /></label>
          <label><span>Plano semanal</span><input onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, weeklyPlanId: e.target.value } }))} value={draft.mercadoPago.weeklyPlanId} /></label>
          <label><span>Access token <SecretState configured={draft.mercadoPago.accessTokenConfigured} /></span><input autoComplete="new-password" onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, accessToken: e.target.value } }))} placeholder="Deixe vazio para manter" type="password" value={draft.mercadoPago.accessToken} /></label>
          <label><span>Segredo do webhook <SecretState configured={draft.mercadoPago.webhookSecretConfigured} /></span><input autoComplete="new-password" onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, webhookSecret: e.target.value } }))} placeholder="Deixe vazio para manter" type="password" value={draft.mercadoPago.webhookSecret} /></label>
        </div>
        <div className="admin-checkboxes"><label><input checked={draft.mercadoPago.clearAccessToken} onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, clearAccessToken: e.target.checked } }))} type="checkbox" /> Remover access token salvo</label><label><input checked={draft.mercadoPago.clearWebhookSecret} onChange={(e) => setDraft((d) => ({ ...d, mercadoPago: { ...d.mercadoPago, clearWebhookSecret: e.target.checked } }))} type="checkbox" /> Remover segredo do webhook</label></div>
        <p>Webhook: <code>{draft.publicUrl.replace(/\/$/u, "")}/api/webhooks/mercadopago</code></p>
        <div className="admin-integration-test"><Button onClick={() => void testIntegration("mercadopago")} type="button" variant="secondary">Testar Mercado Pago</Button><span aria-live="polite">{testStatus.mercadopago}</span></div>
      </section>

      <section className="admin-panel admin-settings-section">
        <div><h2>Inteligência artificial</h2><p>Configuração usada pela Leitura Mágica nos próximos jobs processados.</p></div>
        <div className="admin-form-grid">
          <label><span>Provedor</span><select disabled value="openai"><option value="openai">OpenAI</option></select></label>
          <label><span>Modelo</span><input onChange={(e) => setDraft((d) => ({ ...d, ai: { ...d.ai, model: e.target.value } }))} required value={draft.ai.model} /></label>
          <label><span>Chave da API <SecretState configured={draft.ai.apiKeyConfigured} /></span><input autoComplete="new-password" onChange={(e) => setDraft((d) => ({ ...d, ai: { ...d.ai, apiKey: e.target.value } }))} placeholder="Deixe vazio para manter" type="password" value={draft.ai.apiKey} /></label>
        </div>
        <div className="admin-checkboxes"><label><input checked={draft.ai.clearApiKey} onChange={(e) => setDraft((d) => ({ ...d, ai: { ...d.ai, clearApiKey: e.target.checked } }))} type="checkbox" /> Remover chave salva</label></div>
        <div className="admin-integration-test"><Button onClick={() => void testIntegration("ai")} type="button" variant="secondary">Testar IA</Button><span aria-live="polite">{testStatus.ai}</span></div>
      </section>

      <section className="admin-panel admin-settings-section">
        <div><h2>Alertas operacionais</h2><p>Falhas críticas serão enviadas em JSON para este webhook.</p></div>
        <div className="admin-form-grid">
          <label><span>URL do webhook</span><input onChange={(e) => setDraft((d) => ({ ...d, alerts: { ...d.alerts, url: e.target.value } }))} placeholder="https://..." type="url" value={draft.alerts.url} /></label>
          <label><span>Timeout em milissegundos</span><input max={30000} min={1000} onChange={(e) => setDraft((d) => ({ ...d, alerts: { ...d.alerts, timeoutMs: Number(e.target.value) } }))} type="number" value={draft.alerts.timeoutMs} /></label>
          <label><span>Bearer secret <SecretState configured={draft.alerts.secretConfigured} /></span><input autoComplete="new-password" onChange={(e) => setDraft((d) => ({ ...d, alerts: { ...d.alerts, secret: e.target.value } }))} placeholder="Opcional; vazio mantém" type="password" value={draft.alerts.secret} /></label>
        </div>
        <div className="admin-checkboxes"><label><input checked={draft.alerts.clearSecret} onChange={(e) => setDraft((d) => ({ ...d, alerts: { ...d.alerts, clearSecret: e.target.checked } }))} type="checkbox" /> Remover segredo salvo</label></div>
        <div className="admin-integration-test"><Button onClick={() => void testIntegration("alerts")} type="button" variant="secondary">Enviar alerta de teste</Button><span aria-live="polite">{testStatus.alerts}</span></div>
      </section>

      <section className="admin-panel admin-settings-section">
        <div><h2>Identidade e textos jurídicos</h2><p>Preencha os dados oficiais. Textos personalizados substituem integralmente os rascunhos públicos.</p></div>
        <div className="admin-form-grid">
          <label><span>Operador/controlador</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, operatorName: e.target.value } }))} required value={draft.legal.operatorName} /></label>
          <label><span>Data de vigência</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, effectiveDate: e.target.value } }))} required value={draft.legal.effectiveDate} /></label>
          <label><span>E-mail de privacidade</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, privacyEmail: e.target.value } }))} required type="email" value={draft.legal.privacyEmail} /></label>
          <label><span>E-mail de suporte</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, supportEmail: e.target.value } }))} required type="email" value={draft.legal.supportEmail} /></label>
          <label><span>Legislação aplicável</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, governingLaw: e.target.value } }))} required value={draft.legal.governingLaw} /></label>
          <label><span>Foro</span><input onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, venue: e.target.value } }))} required value={draft.legal.venue} /></label>
        </div>
        <label><span>Política de Privacidade personalizada</span><textarea maxLength={50000} onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, privacyText: e.target.value } }))} placeholder="Deixe vazio para usar o rascunho estruturado" rows={12} value={draft.legal.privacyText} /></label>
        <label><span>Termos de Uso personalizados</span><textarea maxLength={50000} onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, termsText: e.target.value } }))} placeholder="Deixe vazio para usar o rascunho estruturado" rows={12} value={draft.legal.termsText} /></label>
      </section>

      <div className="admin-settings-actions"><Button disabled={status === "saving"} type="submit">{status === "saving" ? "Salvando…" : "Salvar todas as configurações"}</Button><span aria-live="polite">{status === "saved" ? "Configurações salvas e já ativas." : status === "error" ? "Não foi possível salvar. Revise os campos." : ""}</span></div>
    </form>
  </section>;
}
