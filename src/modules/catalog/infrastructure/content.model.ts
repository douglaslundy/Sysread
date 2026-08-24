import mongoose, { Schema, type Model, type Types } from "mongoose";

export type ContentKind = "personal" | "summary";
export type ContentSourceType =
  | "upload_pdf"
  | "upload_epub"
  | "upload_mobi"
  | "link_article"
  | "admin_text"
  | "readcoach_summary";

export interface Content {
  author?: string;
  category?: string;
  cleanupLevel: "disabled" | "light" | "standard";
  coverUrl?: string;
  createdAt: Date;
  kind: ContentKind;
  ownerId?: Types.ObjectId | null;
  processingStatus: "uploaded" | "processing" | "ready" | "failed";
  publishedAt?: Date;
  schemaVersion: number;
  sourceMetadata: Record<string, unknown>;
  sourceType: ContentSourceType;
  title: string;
  updatedAt: Date;
  visibility: "private" | "public";
}

export const contentSchema = new Schema<Content>(
  {
    author: { maxlength: 240, trim: true, type: String },
    category: { index: true, trim: true, type: String },
    cleanupLevel: {
      default: "standard",
      enum: ["disabled", "light", "standard"],
      required: true,
      type: String,
    },
    coverUrl: { trim: true, type: String },
    kind: {
      enum: ["personal", "summary"],
      required: true,
      type: String,
    },
    ownerId: {
      default: null,
      ref: "User",
      type: Schema.Types.ObjectId,
    },
    processingStatus: {
      default: "uploaded",
      enum: ["uploaded", "processing", "ready", "failed"],
      required: true,
      type: String,
    },
    publishedAt: { type: Date },
    schemaVersion: { default: 1, min: 1, required: true, type: Number },
    sourceMetadata: { default: {}, type: Schema.Types.Mixed },
    sourceType: {
      enum: [
        "upload_pdf",
        "upload_epub",
        "upload_mobi",
        "link_article",
        "admin_text",
        "readcoach_summary",
      ],
      required: true,
      type: String,
    },
    title: { maxlength: 500, required: true, trim: true, type: String },
    visibility: {
      default: "private",
      enum: ["private", "public"],
      required: true,
      type: String,
    },
  },
  { timestamps: true },
);

contentSchema.pre("validate", function validateOwnership() {
  if (this.kind === "personal" && !this.ownerId) {
    this.invalidate("ownerId", "Personal content requires an owner.");
  }

  if (this.kind === "summary" && this.ownerId) {
    this.invalidate("ownerId", "Catalog summaries cannot have an owner.");
  }

  if (this.visibility === "private" && !this.ownerId) {
    this.invalidate("ownerId", "Private content requires an assigned user.");
  }

  if (this.visibility === "public" && this.ownerId) {
    this.invalidate("ownerId", "Public content cannot have an assigned user.");
  }

  if (
    this.kind === "summary" &&
    this.sourceType !== "readcoach_summary"
  ) {
    this.invalidate(
      "sourceType",
      "Catalog summaries require the Sysread source type.",
    );
  }
});

contentSchema.index({ ownerId: 1, updatedAt: -1 });
contentSchema.index({ kind: 1, category: 1, publishedAt: -1 });
contentSchema.index(
  { "sourceMetadata.seedKey": 1 },
  {
    partialFilterExpression: {
      kind: "summary",
      "sourceMetadata.seedKey": { $type: "string" },
    },
    unique: true,
  },
);

export const ContentModel =
  (mongoose.models.Content as Model<Content> | undefined) ??
  mongoose.model<Content>("Content", contentSchema);
