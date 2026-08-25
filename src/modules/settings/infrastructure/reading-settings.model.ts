import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ReadingSettings {
  autoAdvance: boolean;
  boostMode: boolean;
  createdAt: Date;
  focusPresentation: "orp" | "vertical" | "horizontal";
  fontFamily: "serif" | "sans" | "mono";
  fontSize: "small" | "medium" | "large" | "extra-large";
  horizontalDirection: "left-to-right" | "right-to-left";
  navigationWordStep: 3 | 5 | 10;
  schemaVersion: number;
  updatedAt: Date;
  userId: Types.ObjectId;
  wordsPerBlock: 1 | 2 | 3;
  wpm: number;
  verticalDirection: "up" | "down";
}

export const readingSettingsSchema = new Schema<ReadingSettings>(
  {
    autoAdvance: { default: false, required: true, type: Boolean },
    boostMode: { default: false, required: true, type: Boolean },
    focusPresentation: { default: "orp", enum: ["orp", "vertical", "horizontal"], required: true, type: String },
    fontFamily: {
      default: "serif",
      enum: ["serif", "sans", "mono"],
      required: true,
      type: String,
    },
    fontSize: {
      default: "large",
      enum: ["small", "medium", "large", "extra-large"],
      required: true,
      type: String,
    },
    horizontalDirection: { default: "left-to-right", enum: ["left-to-right", "right-to-left"], required: true, type: String },
    navigationWordStep: { default: 5, enum: [3, 5, 10], required: true, type: Number },
    schemaVersion: { default: 4, min: 1, required: true, type: Number },
    userId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    wordsPerBlock: {
      default: 1,
      enum: [1, 2, 3],
      required: true,
      type: Number,
    },
    wpm: { default: 350, max: 1000, min: 100, required: true, type: Number },
    verticalDirection: { default: "up", enum: ["up", "down"], required: true, type: String },
  },
  { timestamps: true },
);

readingSettingsSchema.index({ userId: 1 }, { unique: true });

export const ReadingSettingsModel =
  (mongoose.models.ReadingSettings as Model<ReadingSettings> | undefined) ??
  mongoose.model<ReadingSettings>("ReadingSettings", readingSettingsSchema);
