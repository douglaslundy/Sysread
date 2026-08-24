export const catalogCategories = [
  "health",
  "business",
  "psychology",
  "productivity",
  "self-help",
  "philosophy",
  "leadership",
  "finance",
  "science",
  "technology",
  "biography",
] as const;

export type CatalogCategory = (typeof catalogCategories)[number];

export type CatalogItem = {
  author?: string;
  category?: string;
  coverUrl?: string;
  id: string;
  kind: "personal" | "summary";
  progressPercent?: number;
  publishedAt?: string;
  title: string;
  updatedAt: string;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ListPersonalInput = {
  cursor?: string;
  limit: number;
  ownerId: string;
};

export type ListSummariesInput = {
  category?: CatalogCategory;
  cursor?: string;
  limit: number;
};

export interface CatalogRepository {
  listPersonal(input: ListPersonalInput): Promise<Page<CatalogItem>>;
  listSummaries(input: ListSummariesInput): Promise<Page<CatalogItem>>;
}