// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSettings } from "../src/modules/admin/ui/admin-settings";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("admin operational settings", () => {
  it("shows every production configuration group without revealing secrets", () => {
    render(<AdminSettings initialSettings={{
      ai: { apiKeyConfigured: true, model: "gpt-5.6-terra", provider: "openai" },
      alerts: { secretConfigured: true, timeoutMs: 5000, url: "https://alerts.example.test/hook" },
      legal: { effectiveDate: "2026-08-18", governingLaw: "Brasil", operatorName: "Sysread Ltda", privacyEmail: "privacidade@example.test", privacyText: "Texto de privacidade", supportEmail: "suporte@example.test", termsText: "Termos", venue: "São Paulo" },
      mercadoPago: { accessTokenConfigured: true, annualPlanId: "annual", webhookSecretConfigured: true, weeklyPlanId: "weekly" },
      platformName: "Sysread", publicUrl: "https://sysread.example.test", tlsMode: "external",
    }} />);
    expect(screen.getByText("Prontidão para produção")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inteligência artificial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alertas operacionais" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Identidade e textos jurídicos" })).toBeInTheDocument();
    for (const input of document.querySelectorAll('input[type="password"]')) expect(input).toHaveValue("");
    expect(document.body).not.toHaveTextContent("access-token-secret");
  });
});
