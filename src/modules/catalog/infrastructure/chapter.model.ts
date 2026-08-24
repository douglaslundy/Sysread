import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface SimplifiedVariant {
  content?: string;
  generatedAt?: Date;
  inputTokens?: number;
  model: string;
  outputTokens?: number;
  promptVersion: string;
  sourceHash: string;
  status: "pending" | "ready" | "failed";
  totalTokens?: number;
}

export interface Chapter {
  contentId: Types.ObjectId;
  createdAt: Date;
  normalizedTextHash: string;
  order: number;
  originalText: string;
  schemaVersion: number;
  sourceText?: string;
  simplifiedVariants: SimplifiedVariant[];
  title: string;
  updatedAt: Date;
  wordCount: number;
}

const simplifiedVariantSchema = new Schema<SimplifiedVariant>(
  {
    content: { type: String },
    generatedAt: { type: Date },
    inputTokens: { min: 0, type: Number },
    model: { required: true, type: String },
    outputTokens: { min: 0, type: Number },
    promptVersion: { required: true, type: String },
    sourceHash: { required: true, type: String },
    totalTokens: { min: 0, type: Number },
    status: {
      default: "pending",
      enum: ["pending", "ready", "failed"],
      required: true,
      type: String,
    },
  },
  { _id: false },
);

export const chapterSchema = new Schema<Chapter>(
  {
    contentId: {
      ref: "Content",
      required: true,
      type: Schema.Types.ObjectId,
    },
    normalizedTextHash: { required: true, type: String },
    order: { min: 0, required: true, type: Number },
    originalText: { required: true, type: String },
    schemaVersion: { default: 1, min: 1, required: true, type: Number },
    sourceText: { type: String },
    simplifiedVariants: { default: [], type: [simplifiedVariantSchema] },
    title: { maxlength: 500, required: true, trim: true, type: String },
    wordCount: { min: 0, required: true, type: Number },
  },
  { timestamps: true },
);

chapterSchema.index({ contentId: 1, order: 1 }, { unique: true });

export const ChapterModel =
  (mongoose.models.Chapter as Model<Chapter> | undefined) ??
  mongoose.model<Chapter>("Chapter", chapterSchema);