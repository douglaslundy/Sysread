import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { CategoryModel } from "../infrastructure/category.model";

export const defaultCategoryNames = [
  "Ficção",
  "Romance",
  "Fantasia",
  "Suspense e Mistério",
  "Biografia",
  "História",
  "Negócios",
  "Desenvolvimento Pessoal",
  "Filosofia",
  "Psicologia",
  "Ciência",
  "Tecnologia",
  "Saúde",
  "Educação",
  "Religião e Espiritualidade",
] as const;

export type CategoryRow = {
  active: boolean;
  id: string;
  name: string;
  order: number;
};

export class CategoryError extends Error {
  constructor(readonly code: "CATEGORY_DUPLICATE" | "CATEGORY_IN_USE" | "CATEGORY_NOT_FOUND") {
    super(code);
  }
}

export function categorySlug(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 100);
}

function mapCategory(category: { _id: Types.ObjectId; active: boolean; name: string; order: number }): CategoryRow {
  return { active: category.active, id: category._id.toString(), name: category.name, order: category.order };
}

export async function seedDefaultCategories() {
  await connectToMongo();
  await Promise.all(defaultCategoryNames.map((name, order) => CategoryModel.updateOne(
    { slug: categorySlug(name) },
    { $setOnInsert: { active: true, name, order, slug: categorySlug(name) } },
    { upsert: true },
  ).exec()));
}

export async function listCategories(options: { activeOnly?: boolean } = {}) {
  await connectToMongo();
  if (await CategoryModel.estimatedDocumentCount().exec() === 0) await seedDefaultCategories();
  const categories = await CategoryModel.find(options.activeOnly ? { active: true } : {})
    .sort({ order: 1, name: 1 }).lean().exec();
  return categories.map(mapCategory);
}

export async function requireActiveCategory(categoryId: string) {
  if (!Types.ObjectId.isValid(categoryId)) throw new CategoryError("CATEGORY_NOT_FOUND");
  await connectToMongo();
  const category = await CategoryModel.findOne({ _id: categoryId, active: true }).lean().exec();
  if (!category) throw new CategoryError("CATEGORY_NOT_FOUND");
  return mapCategory(category);
}

export async function createCategory(input: { active: boolean; name: string; order: number }) {
  await connectToMongo();
  try {
    return mapCategory(await CategoryModel.create({ ...input, slug: categorySlug(input.name) }));
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) throw new CategoryError("CATEGORY_DUPLICATE");
    throw error;
  }
}

export async function updateCategory(id: string, input: { active?: boolean; name?: string; order?: number }) {
  if (!Types.ObjectId.isValid(id)) throw new CategoryError("CATEGORY_NOT_FOUND");
  await connectToMongo();
  const current = await CategoryModel.findById(id).exec();
  if (!current) throw new CategoryError("CATEGORY_NOT_FOUND");
  const previousName = current.name;
  if (input.name !== undefined) {
    current.name = input.name;
    current.slug = categorySlug(input.name);
  }
  if (input.active !== undefined) current.active = input.active;
  if (input.order !== undefined) current.order = input.order;
  try {
    await current.save();
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) throw new CategoryError("CATEGORY_DUPLICATE");
    throw error;
  }
  if (current.name !== previousName) {
    await ContentModel.updateMany({ category: previousName }, { $set: { category: current.name } }).exec();
  }
  return mapCategory(current);
}

export async function deleteCategory(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new CategoryError("CATEGORY_NOT_FOUND");
  await connectToMongo();
  const category = await CategoryModel.findById(id).lean().exec();
  if (!category) throw new CategoryError("CATEGORY_NOT_FOUND");
  if (await ContentModel.exists({ category: category.name })) throw new CategoryError("CATEGORY_IN_USE");
  await CategoryModel.deleteOne({ _id: category._id }).exec();
}
