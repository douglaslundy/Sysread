import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ReadingProgress {
  chapterId: Types.ObjectId;
  completed: boolean;
  contentId: Types.ObjectId;
  createdAt: Date;
  paragraphAnchor?: string;
  percent: number;
  revision: number;
  schemaVersion: number;
  textVariant: "original" | "simplified";
  textVersionHash: string;
  updatedAt: Date;
  userId: Types.ObjectId;
  wordIndex: number;
}

export const readingProgressSchema = new Schema<ReadingProgress>(
  {
    chapterId: {
      ref: "Chapter",
      required: true,
      type: Schema.Types.ObjectId,
    },
    completed: { default: false, required: true, type: Boolean },
    contentId: {
      ref: "Content",
      required: true,
      type: Schema.Types.ObjectId,
    },
    paragraphAnchor: { type: String },
    percent: { default: 0, max: 100, min: 0, required: true, type: Number },
    revision: { default: 0, min: 0, required: true, type: Number },
    schemaVersion: { default: 1, min: 1, required: true, type: Number },
    textVariant: {
      default: "original",
      enum: ["original", "simplified"],
      required: true,
      type: String,
    },
    textVersionHash: { required: true, type: String },
    userId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    wordIndex: { default: 0, min: 0, required: true, type: Number },
  },
  { timestamps: true },
);

readingProgressSchema.index(
  { userId: 1, contentId: 1 },
  { unique: true },
);

export const ReadingProgressModel =
  (mongoose.models.ReadingProgress as Model<ReadingProgress> | undefined) ??
  mongoose.model<ReadingProgress>("ReadingProgress", readingProgressSchema);