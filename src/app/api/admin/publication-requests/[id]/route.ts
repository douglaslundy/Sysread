import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { decidePublicationRequest, PublicationRequestError } from "@/modules/publication/application/publication-service";

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  justification: z.string().trim().min(5).max(2_000),
}).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const admin = await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Informe uma justificativa para a decisão.", 400);
    const { id } = await context.params;
    return NextResponse.json(await decidePublicationRequest({ adminId: admin.id, requestId: id, ...input.data }));
  } catch (error) {
    if (error instanceof PublicationRequestError) return apiError(request, error.code, error.message, error.statusCode);
    return authErrorResponse(error, request);
  }
}
