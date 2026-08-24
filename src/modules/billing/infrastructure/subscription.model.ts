import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { BillingPlan, NormalizedSubscriptionStatus } from "../application/types";

export interface Subscription {
  createdAt: Date;
  lastNotificationId?: string;
  lastReconciledAt: Date;
  nextPaymentDate?: Date;
  normalizedStatus: NormalizedSubscriptionStatus;
  payerId?: string;
  plan: BillingPlan;
  planId: string;
  providerStatus: string;
  providerSubscriptionId: string;
  schemaVersion: number;
  updatedAt: Date;
  userId: Types.ObjectId;
}

export const subscriptionSchema = new Schema<Subscription>({
  lastNotificationId: { type: String },
  lastReconciledAt: { default: Date.now, required: true, type: Date },
  nextPaymentDate: { type: Date },
  normalizedStatus: {
    enum: ["active", "canceled", "past_due", "paused", "pending"],
    required: true,
    type: String,
  },
  payerId: { type: String },
  plan: { enum: ["annual", "weekly"], required: true, type: String },
  planId: { required: true, type: String },
  providerStatus: { required: true, type: String },
  providerSubscriptionId: { required: true, type: String },
  schemaVersion: { default: 1, min: 1, required: true, type: Number },
  userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
}, { timestamps: true });

subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ providerSubscriptionId: 1 }, { sparse: true, unique: true });
subscriptionSchema.index({ payerId: 1 });

export const SubscriptionModel =
  (mongoose.models.Subscription as Model<Subscription> | undefined) ??
  mongoose.model<Subscription>("Subscription", subscriptionSchema);
