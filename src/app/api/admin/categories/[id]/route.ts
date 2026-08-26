import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { CategoryError, deleteCategory, updateCategory } from "@/modules/categories/application/category-service";

const schema = z.object({ active: z.boolean().optional(), name: z.string().trim().min(2).max(80).optional(), order: z.number().int().min(0).max(9999).optional() }).strict();

function categoryError(request: Request, error: CategoryError) {
  if (error.code === "CATEGORY_NOT_FOUND") return apiError(request, error.code, "Categoria não encontrada.", 404);
  if (error.code === "CATEGORY_IN_USE") return apiError(request, error.code, "A categoria está vinculada a conteúdos e não pode ser excluída.", 409);
  return apiError(request, error.code, "Já existe uma categoria com esse nome.", 409);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success || Object.keys(input.data).length === 0) return apiError(request, "INVALID_INPUT", "Informe os dados que deseja alterar.", 400);
    return NextResponse.json({ category: await updateCategory((await context.params).id, input.data) });
  } catch (error) {
    if (error instanceof CategoryError) return categoryError(request, error);
    return authErrorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    await requireAdminRequestUser(request);
    await deleteCategory((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CategoryError) return categoryError(request, error);
    return authErrorResponse(error, request);
  }
}
