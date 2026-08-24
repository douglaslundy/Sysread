import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import {
  MongoSimplificationRepository,
  SimplificationRequestError,
} from "@/modules/magic/infrastructure/simplification-repository";
import { consumeRateLimit, rateLimitResponse } from "@/modules/security/infrastructure/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const rate = await consumeRateLimit({ identity: user.id, limit: 30, scope: "ai_requests", windowMs: 60 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(request, rate.retryAfterSeconds);
    const { id } = await context.params;
    const result = await new MongoSimplificationRepository().request({
      actorUserId: user.id,
      chapterId: id,
    });
    if (!result) {
      return apiError(request, "CHAPTER_NOT_FOUND", "Chapter not found." , 404 );
    }
    return NextResponse.json(result, { status: result.state === "ready" ? 200 : 202 });
  } catch (error) {
    if (error instanceof SimplificationRequestError) {
      return apiError(request, error.code, error.message , 429 );
    }
    return authErrorResponse(error, request);
  }
}
