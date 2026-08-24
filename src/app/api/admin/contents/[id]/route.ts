import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { deleteAdminContent, updateAdminContent } from "@/modules/admin/application/admin-service";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";

const schema = z.object({ author: z.string().trim().max(240).optional(), assignedUserId: z.string().nullable().optional(), category: z.string().trim().max(80).optional(), text: z.string().trim().min(20).max(2_000_000).optional(), title: z.string().trim().min(2).max(500).optional(), visibility: z.enum(["private", "public"]).optional() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request); await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Verifique os dados do conteúdo.", 400);
    const { id } = await context.params;
    if (!await updateAdminContent(id, input.data)) return apiError(request, "CONTENT_NOT_FOUND", "Conteúdo não encontrado.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ASSIGNEE_REQUIRED") return apiError(request, "ASSIGNEE_REQUIRED", "Selecione o usuário do conteúdo privado.", 400);
    return authErrorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request); await requireAdminRequestUser(request);
    const { id } = await context.params;
    if (!await deleteAdminContent(id)) return apiError(request, "CONTENT_NOT_FOUND", "Conteúdo não encontrado.", 404);
    return NextResponse.json({ success: true });
  } catch (error) { return authErrorResponse(error, request); }
}
