import { getRuntimeSettings } from "@/modules/admin/application/platform-settings";
import { BillingError } from "../application/billing-service";
import type { BillingPlan } from "../application/types";
import { MercadoPagoBillingProvider } from "./mercadopago-provider";

export async function configuredBilling() {
  const settings = await getRuntimeSettings();
  if (!settings.mercadoPago.accessToken) {
    throw new BillingError("BILLING_NOT_CONFIGURED", 503, "Billing is not configured.");
  }
  return { provider: new MercadoPagoBillingProvider(settings.mercadoPago.accessToken), settings };
}

export async function configuredPlanId(plan: BillingPlan) {
  const settings = await getRuntimeSettings();
  const id = plan === "annual" ? settings.mercadoPago.annualPlanId : settings.mercadoPago.weeklyPlanId;
  if (!id) throw new BillingError("BILLING_NOT_CONFIGURED", 503, "Billing plan is not configured.");
  return id;
}
