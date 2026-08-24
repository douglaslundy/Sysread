import mongoose, { Schema, type Model, type Types } from "mongoose";

export type JobKind = "import_pdf" | "import_epub" | "import_mobi" | "import_url" | "simplify";
export type JobState = "queued" | "processing" | "completed" | "failed";

export interface Job {
  attempts: number;
  completedAt?: Date;
  createdAt: Date;
  deadLetteredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  idempotencyKey: string;
  kind: JobKind;
  leaseExpiresAt?: Date;
  lockedAt?: Date;
  lockToken?: string;
  maxAttempts: number;
  nextAttemptAt: Date;
  ownerId: Types.ObjectId;
  progress: number;
  schemaVersion: number;
  state: JobState;
  statusCode: string;
  subjectId: Types.ObjectId;
  updatedAt: Date;
}

export const jobSchema = new Schema<Job>(
  {
    attempts: { default: 0, min: 0, required: true, type: Number },
    completedAt: { type: Date },
    deadLetteredAt: { type: Date },
    errorCode: { maxlength: 80, type: String },
    errorMessage: { maxlength: 500, type: String },
    idempotencyKey: { required: true, trim: true, type: String },
    kind: {
      enum: ["import_pdf", "import_epub", "import_mobi", "import_url", "simplify"],
      required: true,
      type: String,
    },
    leaseExpiresAt: { type: Date },
    lockedAt: { type: Date },
    lockToken: { type: String },
    maxAttempts: { default: 3, min: 1, required: true, type: Number },
    nextAttemptAt: { default: Date.now, required: true, type: Date },
    ownerId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    progress: { default: 0, max: 100, min: 0, required: true, type: Number },
    schemaVersion: { default: 1, min: 1, required: true, type: Number },
    state: {
      default: "queued",
      enum: ["queued", "processing", "completed", "failed"],
      required: true,
      type: String,
    },
    statusCode: { default: "QUEUED", maxlength: 80, required: true, type: String },
    subjectId: {
      ref: "Content",
      required: true,
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

jobSchema.index({ idempotencyKey: 1 }, { unique: true });
jobSchema.index({ state: 1, nextAttemptAt: 1 });
jobSchema.index({ state: 1, leaseExpiresAt: 1 });
jobSchema.index({ ownerId: 1, createdAt: -1 });

export const JobModel =
  (mongoose.models.Job as Model<Job> | undefined) ??
  mongoose.model<Job>("Job", jobSchema);
