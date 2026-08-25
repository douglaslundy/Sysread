import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { SafeFetchError } from "@/modules/imports/infrastructure/safe-http-fetch";
import { createUrlImport } from "@/modules/imports/infrastructure/url-import-service";
import { consumeRateLimit, rateLimitResponse } from "@/modules/security/infrastructure/rate-limit";

const schema = z.object({ publicationRequested: z.boolean().optional().default(false), url: z.string().trim().min(1).max(2048) }).strict();

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const rate = await consumeRateLimit({ identity: user.id, limit: 20, scope: "imports", windowMs: 60 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(request, rate.retryAfterSeconds);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Enter a valid URL." , 400 );
    return NextResponse.json(await createUrlImport(user.id, input.data.url, {
      publicationRequested: input.data.publicationRequested,
      requesterRole: user.role,
    }), { status: 202 });
  } catch (error) {
    if (error instanceof SafeFetchError) {
      return apiError(request, error.code, error.message , 400 );
    }
    return authErrorResponse(error, request);
  }
}
