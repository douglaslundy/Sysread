import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface PublicationRequest {
  contentId: Types.ObjectId;
  createdAt: Date;
  decidedAt?: Date;
  decidedBy?: Types.ObjectId;
  justification?: string;
  requesterId: Types.ObjectId;
  requesterRole: "admin" | "user";
  status: "approved" | "pending" | "rejected";
  updatedAt: Date;
}

const publicationRequestSchema = new Schema<PublicationRequest>(
  {
    contentId: { index: true, ref: "Content", required: true, type: Schema.Types.ObjectId },
    decidedAt: { type: Date },
    decidedBy: { ref: "User", type: Schema.Types.ObjectId },
    justification: { maxlength: 2_000, trim: true, type: String },
    requesterId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
    requesterRole: { enum: ["admin", "user"], required: true, type: String },
    status: { default: "pending", enum: ["approved", "pending", "rejected"], index: true, required: true, type: String },
  },
  { timestamps: true },
);

publicationRequestSchema.index({ contentId: 1 }, { unique: true });
publicationRequestSchema.index({ status: 1, createdAt: -1 });

export const PublicationRequestModel =
  (mongoose.models.PublicationRequest as Model<PublicationRequest> | undefined) ??
  mongoose.model<PublicationRequest>("PublicationRequest", publicationRequestSchema);
