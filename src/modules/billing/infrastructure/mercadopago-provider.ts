import { z } from "zod";
import { BillingError } from "../application/billing-service";
import type { BillingProvider } from "../application/types";

const planSchema = z.object({
  auto_recurring: z.object({
    currency_id: z.string(),
    frequency: z.number(),
    frequency_type: z.string(),
    free_trial: z.object({ frequency: z.number(), frequency_type: z.string() }).optional(),
    transaction_amount: z.number(),
  }),
  id: z.string(),
}).passthrough();

const subscriptionSchema = z.object({
  auto_recurring: z.object({ next_payment_date: z.string().optional() }).optional(),
  id: z.string(),
  init_point: z.string().url().optional(),
  payer_id: z.union([z.number(), z.string()]).optional(),
  preapproval_plan_id: z.string(),
  status: z.string(),
}).passthrough();

export class MercadoPagoBillingProvider implements BillingProvider {
  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher("https://api.mercadopago.com" + path, {
        ...init,
        headers: {
          Authorization: "Bearer " + this.accessToken,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new BillingError("PROVIDER_ERROR", 502, "Mercado Pago is temporarily unavailable.");
    }
    if (!response.ok) {
      throw new BillingError("PROVIDER_ERROR", 502, "Mercado Pago rejected the request.");
    }
    return response.json();
  }

  async getPlan(planId: string) {
    const result = planSchema.safeParse(await this.request("/preapproval_plan/" + encodeURIComponent(planId)));
    if (!result.success) throw new BillingError("PROVIDER_ERROR", 502, "Mercado Pago returned an invalid plan.");
    const trial = result.data.auto_recurring.free_trial;
    return {
      amount: result.data.auto_recurring.transaction_amount,
      currency: result.data.auto_recurring.currency_id,
      frequency: result.data.auto_recurring.frequency,
      frequencyType: result.data.auto_recurring.frequency_type,
      id: result.data.id,
      trialDays: trial?.frequency_type === "days" ? trial.frequency : 0,
    };
  }

  private mapSubscription(value: unknown) {
    const result = subscriptionSchema.safeParse(value);
    if (!result.success) throw new BillingError("PROVIDER_ERROR", 502, "Mercado Pago returned an invalid subscription.");
    return {
      id: result.data.id,
      initPoint: result.data.init_point,
      nextPaymentDate: result.data.auto_recurring?.next_payment_date,
      payerId: result.data.payer_id === undefined ? undefined : String(result.data.payer_id),
      planId: result.data.preapproval_plan_id,
      status: result.data.status,
    };
  }

  async createSubscription(input: {
    backUrl: string;
    externalReference: string;
    payerEmail: string;
    planId: string;
    reason: string;
  }) {
    return this.mapSubscription(await this.request("/preapproval", {
      body: JSON.stringify({
        back_url: input.backUrl,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        preapproval_plan_id: input.planId,
        reason: input.reason,
        status: "pending",
      }),
      method: "POST",
    }));
  }

  async getSubscription(subscriptionId: string) {
    return this.mapSubscription(await this.request("/preapproval/" + encodeURIComponent(subscriptionId)));
  }

  async updateSubscription(subscriptionId: string, status: "authorized" | "canceled" | "paused") {
    return this.mapSubscription(await this.request("/preapproval/" + encodeURIComponent(subscriptionId), {
      body: JSON.stringify({ status }),
      method: "PUT",
    }));
  }
}
