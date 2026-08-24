import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { updateAdminUser } from "@/modules/admin/application/admin-service";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";

const schema = z.object({ accessExpiresAt: z.string().datetime().nullable().optional(), status: z.enum(["active", "blocked"]).optional() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const actor = await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Verifique os dados do usuário.", 400);
    const { id } = await context.params;
    const updated = await updateAdminUser(actor.id, id, input.data);
    if (!updated) return apiError(request, "USER_NOT_FOUND", "Usuário não encontrado.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SELF_BLOCK_FORBIDDEN") return apiError(request, "SELF_BLOCK_FORBIDDEN", "Você não pode bloquear sua própria conta.", 409);
    return authErrorResponse(error, request);
  }
}
