import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "../src/modules/catalog/application/catalog-service";
import {
  decodeCatalogCursor,
  encodeCatalogCursor,
} from "../src/modules/catalog/application/cursor";
import type { CatalogRepository } from "../src/modules/catalog/application/types";
import {
  listQuerySchema,
  summaryQuerySchema,
} from "../src/modules/catalog/infrastructure/query-validation";
import { GET as getSummaries } from "../src/app/api/summaries/route";

describe("catalog pagination", () => {
  it("round-trips opaque validated cursors", () => {
    const cursor = {
      id: "507f1f77bcf86cd799439011",
      timestamp: "2026-08-17T12:00:00.000Z",
    };
    const encoded = encodeCatalogCursor(cursor);

    expect(encoded).not.toContain(cursor.id);
    expect(decodeCatalogCursor(encoded)).toEqual(cursor);
    expect(decodeCatalogCursor("not-a-cursor")).toBeNull();
  });

  it("bounds page sizes and validates categories", () => {
    expect(listQuerySchema.parse({}).limit).toBe(20);
    expect(listQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(
      summaryQuerySchema.safeParse({ category: "biography", limit: 10 })
        .success,
    ).toBe(true);
    expect(
      summaryQuerySchema.safeParse({ category: "unknown", limit: 10 })
        .success,
    ).toBe(false);
  });

  it("takes personal ownership only from the service input", async () => {
    const repository: CatalogRepository = {
      listPersonal: vi.fn(async () => ({ items: [], nextCursor: null })),
      listSummaries: vi.fn(async () => ({ items: [], nextCursor: null })),
    };
    const service = new CatalogService(repository);

    await service.listPersonal({
      limit: 20,
      ownerId: "session-user-id",
    });

    expect(repository.listPersonal).toHaveBeenCalledWith({
      limit: 20,
      ownerId: "session-user-id",
    });
  });

  it("rejects invalid public catalog queries before database access", async () => {
    const response = await getSummaries(
      new Request("http://localhost/api/summaries?category=unknown"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_QUERY" },
    });
  });
});