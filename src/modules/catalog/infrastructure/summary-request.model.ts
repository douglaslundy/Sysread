import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface SummaryRequest {
  authorNormalized: string;
  authorRequested: string;
  createdAt: Date;
  schemaVersion: number;
  status: "pending" | "in_production" | "published" | "rejected";
  titleNormalized: string;
  titleRequested: string;
  updatedAt: Date;
  userId: Types.ObjectId;
}

export const summaryRequestSchema = new Schema<SummaryRequest>(
  {
    authorNormalized: { required: true, trim: true, type: String },
    authorRequested: {
      maxlength: 300,
      required: true,
      trim: true,
      type: String,
    },
    schemaVersion: { default: 1, min: 1, required: true, type: Number },
    status: {
      default: "pending",
      enum: ["pending", "in_production", "published", "rejected"],
      required: true,
      type: String,
    },
    titleNormalized: { required: true, trim: true, type: String },
    titleRequested: {
      maxlength: 500,
      required: true,
      trim: true,
      type: String,
    },
    userId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

summaryRequestSchema.index(
  { userId: 1, titleNormalized: 1, authorNormalized: 1 },
  { unique: true },
);
summaryRequestSchema.index({ status: 1, createdAt: 1 });

export const SummaryRequestModel =
  (mongoose.models.SummaryRequest as Model<SummaryRequest> | undefined) ??
  mongoose.model<SummaryRequest>("SummaryRequest", summaryRequestSchema);