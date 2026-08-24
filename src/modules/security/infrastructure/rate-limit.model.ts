import mongoose, { Schema, type Model } from "mongoose";

export interface RateLimitBucket {
  count: number;
  createdAt: Date;
  expiresAt: Date;
  key: string;
  updatedAt: Date;
}

export const rateLimitBucketSchema = new Schema<RateLimitBucket>({
  count: { default: 0, min: 0, required: true, type: Number },
  expiresAt: { required: true, type: Date },
  key: { required: true, type: String },
}, { timestamps: true });

rateLimitBucketSchema.index({ key: 1 }, { unique: true });
rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucketModel =
  (mongoose.models.RateLimitBucket as Model<RateLimitBucket> | undefined) ??
  mongoose.model<RateLimitBucket>("RateLimitBucket", rateLimitBucketSchema);
