import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface UploadQuota {
  createdAt: Date;
  ownerId: Types.ObjectId;
  updatedAt: Date;
  usedBytes: number;
}

const uploadQuotaSchema = new Schema<UploadQuota>(
  {
    ownerId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    usedBytes: { default: 0, min: 0, required: true, type: Number },
  },
  { timestamps: true },
);

uploadQuotaSchema.index({ ownerId: 1 }, { unique: true });

export const UploadQuotaModel =
  (mongoose.models.UploadQuota as Model<UploadQuota> | undefined) ??
  mongoose.model<UploadQuota>("UploadQuota", uploadQuotaSchema);