import { describe, expect, it } from "vitest";
import { categorySlug, defaultCategoryNames } from "../src/modules/categories/application/category-service";

describe("categories", () => {
  it("provides a useful initial catalog", () => {
    expect(defaultCategoryNames).toContain("Ficção");
    expect(defaultCategoryNames).toContain("Negócios");
    expect(defaultCategoryNames).toContain("Tecnologia");
    expect(defaultCategoryNames.length).toBeGreaterThanOrEqual(12);
  });

  it("creates stable slugs for Portuguese category names", () => {
    expect(categorySlug(" Suspense e Mistério ")).toBe("suspense-e-misterio");
    expect(categorySlug("Ciência & Tecnologia")).toBe("ciencia-tecnologia");
  });
});
