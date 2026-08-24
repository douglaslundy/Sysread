import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { CatalogService } from "@/modules/catalog/application/catalog-service";
import { decodeCatalogCursor } from "@/modules/catalog/application/cursor";
import { MongoCatalogRepository } from "@/modules/catalog/infrastructure/catalog-repository";
import { summaryQuerySchema } from "@/modules/catalog/infrastructure/query-validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = summaryQuerySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (
    !query.success ||
    (query.data.cursor && !decodeCatalogCursor(query.data.cursor))
  ) {
    return apiError(request, "INVALID_QUERY", "Invalid catalog query." , 400 );
  }

  try {
    const page = await new CatalogService(
      new MongoCatalogRepository(),
    ).listSummaries(query.data);
    return NextResponse.json(page);
  } catch {
    return apiError(request, "INTERNAL_ERROR", "The catalog could not be loaded.", 500 );
  }
}