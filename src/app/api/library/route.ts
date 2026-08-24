import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { CatalogService } from "@/modules/catalog/application/catalog-service";
import { decodeCatalogCursor } from "@/modules/catalog/application/cursor";
import { MongoCatalogRepository } from "@/modules/catalog/infrastructure/catalog-repository";
import { listQuerySchema } from "@/modules/catalog/infrastructure/query-validation";

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    const url = new URL(request.url);
    const query = listQuerySchema.safeParse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (
      !query.success ||
      (query.data.cursor && !decodeCatalogCursor(query.data.cursor))
    ) {
      return apiError(request, "INVALID_QUERY", "Invalid pagination." , 400 );
    }

    const page = await new CatalogService(
      new MongoCatalogRepository(),
    ).listPersonal({
      cursor: query.data.cursor,
      limit: query.data.limit,
      ownerId: user.id,
    });
    return NextResponse.json(page);
  } catch (error) {
    return authErrorResponse(error, request);
  }
}