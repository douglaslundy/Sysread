import type {
  BillingPlan,
  BillingProvider,
  NormalizedSubscriptionStatus,
  PlanDefinition,
  ProviderPlan,
} from "./types";

export const PLAN_DEFINITIONS: Record<BillingPlan, PlanDefinition> = {
  annual: {
    amount: 97,
    currency: "USD",
    frequency: 12,
    frequencyType: "months",
    plan: "annual",
    trialDays: 7,
  },
  weekly: {
    amount: 4.99,
    currency: "USD",
    frequency: 1,
    frequencyType: "weeks",
    plan: "weekly",
    trialDays: 0,
  },
};

export class BillingError extends Error {
  constructor(
    readonly code: "BILLING_NOT_CONFIGURED" | "INVALID_PROVIDER_PLAN" | "PROVIDER_ERROR",
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeProviderStatus(status: string): NormalizedSubscriptionStatus {
  switch (status.toLowerCase()) {
    case "authorized": return "active";
    case "paused": return "paused";
    case "cancelled":
    case "canceled": return "canceled";
    case "pending": return "pending";
    default: return "past_due";
  }
}

export function assertProviderPlan(plan: ProviderPlan, expected: PlanDefinition): void {
  const amountMatches = Math.abs(plan.amount - expected.amount) < 0.001;
  const frequencyMatches = plan.frequency === expected.frequency &&
    plan.frequencyType === expected.frequencyType;
  if (
    !amountMatches ||
    plan.currency !== expected.currency ||
    !frequencyMatches ||
    plan.trialDays !== expected.trialDays
  ) {
    throw new BillingError("INVALID_PROVIDER_PLAN", 502, "Configured provider plan does not match the product.");
  }
}

export function hasEntitlement(status: NormalizedSubscriptionStatus, nextPaymentDate?: string): boolean {
  if (status !== "active") return false;
  if (!nextPaymentDate) return true;
  const timestamp = Date.parse(nextPaymentDate);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export async function createVerifiedCheckout(input: {
  appUrl: string;
  payerEmail: string;
  plan: BillingPlan;
  planId: string;
  platformName: string;
  provider: BillingProvider;
  userId: string;
}) {
  const providerPlan = await input.provider.getPlan(input.planId);
  assertProviderPlan(providerPlan, PLAN_DEFINITIONS[input.plan]);
  return input.provider.createSubscription({
    backUrl: input.appUrl + "/reader",
    externalReference: input.userId,
    payerEmail: input.payerEmail,
    planId: input.planId,
    reason: input.platformName + (input.plan === "annual" ? " Annual" : " Weekly"),
  });
}
