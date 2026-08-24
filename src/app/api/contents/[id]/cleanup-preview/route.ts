import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { CleanupContentError, previewContentCleanup } from "@/modules/imports/application/content-cleanup-service";

const querySchema = z.object({
  chapterId: z.string().optional(),
  level: z.enum(["disabled", "light", "standard"]),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveRequestUser(request);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return apiError(request, "INVALID_INPUT", "Choose a valid cleanup level." , 400 );
    const { id } = await context.params;
    return NextResponse.json({ preview: await previewContentCleanup({ ...parsed.data, contentId: id, ownerId: user.id }) });
  } catch (error) {
    if (error instanceof CleanupContentError) return apiError(request, error.code, error.message , 404 );
    return authErrorResponse(error, request);
  }
}