import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { ReadingMode } from "../application/reading-session-service";

export interface ReadingSession {
  averageWpm?: number;
  contentId: Types.ObjectId;
  createdAt: Date;
  endedAt?: Date;
  mode: ReadingMode;
  schemaVersion: number;
  startedAt: Date;
  updatedAt: Date;
  userId: Types.ObjectId;
  wordsRead: number;
}

export const readingSessionSchema = new Schema<ReadingSession>({
  averageWpm: { max: 5000, min: 0, type: Number },
  contentId: { ref: "Content", required: true, type: Schema.Types.ObjectId },
  endedAt: { type: Date },
  mode: { enum: ["continuous", "focus"], required: true, type: String },
  schemaVersion: { default: 1, min: 1, required: true, type: Number },
  startedAt: { default: Date.now, required: true, type: Date },
  userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  wordsRead: { default: 0, min: 0, required: true, type: Number },
}, { timestamps: true });

readingSessionSchema.index({ userId: 1, startedAt: -1 });
readingSessionSchema.index({ contentId: 1, startedAt: -1 });

export const ReadingSessionModel =
  (mongoose.models.ReadingSession as Model<ReadingSession> | undefined) ??
  mongoose.model<ReadingSession>("ReadingSession", readingSessionSchema);
