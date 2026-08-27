import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface Note {
  chapterId: Types.ObjectId;
  contentId: Types.ObjectId;
  createdAt: Date;
  excerpt: string;
  paragraphAnchor?: string;
  title: string;
  updatedAt: Date;
  userId: Types.ObjectId;
}

export const noteSchema = new Schema<Note>(
  {
    chapterId: { ref: "Chapter", required: true, type: Schema.Types.ObjectId },
    contentId: { ref: "Content", required: true, type: Schema.Types.ObjectId },
    excerpt: { maxlength: 8_000, required: true, trim: true, type: String },
    paragraphAnchor: { maxlength: 200, type: String },
    title: { maxlength: 200, required: true, trim: true, type: String },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, createdAt: -1 });

export const NoteModel =
  (mongoose.models.Note as Model<Note> | undefined) ??
  mongoose.model<Note>("Note", noteSchema);
