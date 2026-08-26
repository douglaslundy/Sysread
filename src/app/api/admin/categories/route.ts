import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { CategoryError, createCategory, listCategories } from "@/modules/categories/application/category-service";

const schema = z.object({ active: z.boolean().default(true), name: z.string().trim().min(2).max(80), order: z.number().int().min(0).max(9999).default(0) }).strict();

export async function GET(request: Request) {
  try {
    await requireAdminRequestUser(request);
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Informe um nome válido para a categoria.", 400);
    return NextResponse.json({ category: await createCategory(input.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof CategoryError && error.code === "CATEGORY_DUPLICATE") return apiError(request, error.code, "Já existe uma categoria com esse nome.", 409);
    return authErrorResponse(error, request);
  }
}
