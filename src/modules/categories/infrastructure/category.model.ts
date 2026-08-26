import mongoose, { Schema, type Model } from "mongoose";

export interface Category {
  active: boolean;
  createdAt: Date;
  name: string;
  order: number;
  slug: string;
  updatedAt: Date;
}

const categorySchema = new Schema<Category>(
  {
    active: { default: true, index: true, required: true, type: Boolean },
    name: { maxlength: 80, required: true, trim: true, type: String },
    order: { default: 0, min: 0, required: true, type: Number },
    slug: { maxlength: 100, required: true, trim: true, type: String, unique: true },
  },
  { timestamps: true },
);

categorySchema.index({ active: 1, order: 1, name: 1 });

export const CategoryModel =
  (mongoose.models.Category as Model<Category> | undefined) ??
  mongoose.model<Category>("Category", categorySchema);
