import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import type { BillingPlan, ProviderSubscription } from "../application/types";
import { normalizeProviderStatus } from "../application/billing-service";
import { SubscriptionModel } from "./subscription.model";

export async function saveCheckout(input: {
  plan: BillingPlan;
  subscription: ProviderSubscription;
  userId: string;
}) {
  await connectToMongo();
  return SubscriptionModel.findOneAndUpdate(
    { userId: new Types.ObjectId(input.userId) },
    {
      $set: {
        lastReconciledAt: new Date(),
        nextPaymentDate: input.subscription.nextPaymentDate ? new Date(input.subscription.nextPaymentDate) : undefined,
        normalizedStatus: normalizeProviderStatus(input.subscription.status),
        payerId: input.subscription.payerId,
        plan: input.plan,
        planId: input.subscription.planId,
        providerStatus: input.subscription.status,
        providerSubscriptionId: input.subscription.id,
      },
    },
    { returnDocument: "after", upsert: true },
  ).exec();
}

export async function findSubscription(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return null;
  await connectToMongo();
  return SubscriptionModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
}

export async function reconcileSubscription(input: {
  lastNotificationId?: string;
  subscription: ProviderSubscription;
}) {
  await connectToMongo();
  return SubscriptionModel.findOneAndUpdate(
    { providerSubscriptionId: input.subscription.id, planId: input.subscription.planId },
    {
      $set: {
        lastNotificationId: input.lastNotificationId,
        lastReconciledAt: new Date(),
        nextPaymentDate: input.subscription.nextPaymentDate ? new Date(input.subscription.nextPaymentDate) : undefined,
        normalizedStatus: normalizeProviderStatus(input.subscription.status),
        payerId: input.subscription.payerId,
        planId: input.subscription.planId,
        providerStatus: input.subscription.status,
      },
    },
    { returnDocument: "after" },
  ).exec();
}
