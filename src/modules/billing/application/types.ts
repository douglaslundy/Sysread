export type BillingPlan = "annual" | "weekly";
export type NormalizedSubscriptionStatus = "active" | "canceled" | "past_due" | "paused" | "pending";

export interface PlanDefinition {
  amount: number;
  currency: "USD";
  frequency: number;
  frequencyType: "months" | "weeks";
  plan: BillingPlan;
  trialDays: number;
}

export interface ProviderPlan {
  amount: number;
  currency: string;
  frequency: number;
  frequencyType: string;
  id: string;
  trialDays: number;
}

export interface ProviderSubscription {
  id: string;
  initPoint?: string;
  nextPaymentDate?: string;
  payerId?: string;
  planId: string;
  status: string;
}

export interface BillingProvider {
  createSubscription(input: {
    backUrl: string;
    externalReference: string;
    payerEmail: string;
    planId: string;
    reason: string;
  }): Promise<ProviderSubscription>;
  getPlan(planId: string): Promise<ProviderPlan>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  updateSubscription(subscriptionId: string, status: "authorized" | "canceled" | "paused"): Promise<ProviderSubscription>;
}
