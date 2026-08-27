import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  PLAN_DEFINITIONS,
  assertProviderPlan,
  createVerifiedCheckout,
  hasEntitlement,
  normalizeProviderStatus,
} from "../src/modules/billing/application/billing-service";
import { MercadoPagoBillingProvider } from "../src/modules/billing/infrastructure/mercadopago-provider";
import { validateMercadoPagoSignature } from "../src/modules/billing/infrastructure/webhook-signature";

describe("Mercado Pago billing", () => {
  it("keeps product prices server-side and rejects mismatched provider plans", () => {
    expect(PLAN_DEFINITIONS.annual).toMatchObject({ amount: 97, currency: "USD", trialDays: 7 });
    expect(PLAN_DEFINITIONS.weekly).toMatchObject({ amount: 4.99, currency: "USD", trialDays: 0 });
    expect(() => assertProviderPlan({
      amount: 96, currency: "USD", frequency: 12, frequencyType: "months", id: "plan", trialDays: 7,
    }, PLAN_DEFINITIONS.annual)).toThrow("does not match");
  });

  it("verifies the provider plan before creating checkout", async () => {
    const provider = {
      createSubscription: vi.fn(async () => ({ id: "sub", initPoint: "https://mercadopago.com/checkout", planId: "annual-id", status: "pending" })),
      getPlan: vi.fn(async () => ({ amount: 97, currency: "USD", frequency: 12, frequencyType: "months", id: "annual-id", trialDays: 7 })),
      getSubscription: vi.fn(),
      updateSubscription: vi.fn(),
    };
    const result = await createVerifiedCheckout({
      appUrl: "https://read.test", payerEmail: "reader@example.com", plan: "annual",
      planId: "annual-id", platformName: "Reader Pro", provider, userId: "user-1",
    });
    expect(result.initPoint).toContain("mercadopago.com");
    expect(provider.getPlan).toHaveBeenCalledBefore(provider.createSubscription);
    expect(provider.createSubscription).toHaveBeenCalledWith(expect.objectContaining({ planId: "annual-id", reason: "Reader Pro Annual" }));
  });

  it("normalizes entitlement without trusting client state", () => {
    expect(normalizeProviderStatus("authorized")).toBe("active");
    expect(normalizeProviderStatus("paused")).toBe("paused");
    expect(hasEntitlement("active", new Date(Date.now() + 60_000).toISOString())).toBe(true);
    expect(hasEntitlement("active", new Date(Date.now() - 60_000).toISOString())).toBe(false);
    expect(hasEntitlement("paused")).toBe(false);
  });

  it("validates x-signature with timestamp and constant-time digest", () => {
    const secret = "webhook-secret";
    const dataId = "ABC123";
    const requestId = "request-1";
    const ts = String(Math.floor(Date.now() / 1000));
    const manifest = "id:abc123;request-id:request-1;ts:" + ts + ";";
    const digest = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(validateMercadoPagoSignature({
      dataId, requestId, secret, signature: "ts=" + ts + ",v1=" + digest,
    }).valid).toBe(true);
    expect(validateMercadoPagoSignature({
      dataId, requestId, secret, signature: "ts=" + ts + ",v1=" + "0".repeat(64),
    }).valid).toBe(false);
  });

  it("maps Mercado Pago plan and subscription envelopes", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "plan-1", auto_recurring: { currency_id: "USD", frequency: 1, frequency_type: "weeks", transaction_amount: 4.99 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "sub-1", init_point: "https://www.mercadopago.com/checkout", preapproval_plan_id: "plan-1", status: "pending",
      }), { status: 200 }));
    const provider = new MercadoPagoBillingProvider("token", fetcher as typeof fetch);
    await expect(provider.getPlan("plan-1")).resolves.toMatchObject({ amount: 4.99, trialDays: 0 });
    await expect(provider.createSubscription({
      backUrl: "https://read.test", externalReference: "user", payerEmail: "a@b.com", planId: "plan-1", reason: "Sysread",
    })).resolves.toMatchObject({ id: "sub-1", status: "pending" });
  });
});
