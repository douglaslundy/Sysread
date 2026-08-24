import { z } from "zod";
import { catalogCategories } from "../application/types";

export const listQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const summaryQuerySchema = listQuerySchema.extend({
  category: z.enum(catalogCategories).optional(),
});