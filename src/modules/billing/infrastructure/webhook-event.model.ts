import mongoose, { Schema, type Model } from "mongoose";

export interface BillingWebhookEvent {
  createdAt: Date;
  eventKey: string;
  providerResourceId: string;
  providerTimestamp: number;
  reconciledAt?: Date;
  schemaVersion: number;
  topic: string;
  updatedAt: Date;
}

export const billingWebhookEventSchema = new Schema<BillingWebhookEvent>({
  eventKey: { required: true, type: String },
  providerResourceId: { required: true, type: String },
  providerTimestamp: { required: true, type: Number },
  reconciledAt: { type: Date },
  schemaVersion: { default: 1, min: 1, required: true, type: Number },
  topic: { required: true, type: String },
}, { timestamps: true });

billingWebhookEventSchema.index({ eventKey: 1 }, { unique: true });
billingWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const BillingWebhookEventModel =
  (mongoose.models.BillingWebhookEvent as Model<BillingWebhookEvent> | undefined) ??
  mongoose.model<BillingWebhookEvent>("BillingWebhookEvent", billingWebhookEventSchema);
