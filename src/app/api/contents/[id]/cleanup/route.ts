import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { applyContentCleanup, CleanupContentError } from "@/modules/imports/application/content-cleanup-service";

const schema = z.object({ level: z.enum(["disabled", "light", "standard"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Choose a valid cleanup level." , 400 );
    const { id } = await context.params;
    return NextResponse.json({ cleanup: await applyContentCleanup({ contentId: id, level: input.data.level, ownerId: user.id }) });
  } catch (error) {
    if (error instanceof CleanupContentError) return apiError(request, error.code, error.message , 404 );
    return authErrorResponse(error, request);
  }
}
