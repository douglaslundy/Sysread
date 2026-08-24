import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import {
  DuplicateSummaryRequestError,
  SummaryRequestService,
} from "@/modules/catalog/application/summary-request-service";
import { MongoSummaryRequestRepository } from "@/modules/catalog/infrastructure/summary-request-repository";
import { consumeRateLimit, rateLimitResponse } from "@/modules/security/infrastructure/rate-limit";

const requestSchema = z.object({
  author: z.string().trim().min(2).max(300),
  title: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const rate = await consumeRateLimit({ identity: user.id, limit: 10, scope: "summary_requests", windowMs: 24 * 60 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(request, rate.retryAfterSeconds);
    const input = requestSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the book title and author.", 400 );
    }

    const created = await new SummaryRequestService(
      new MongoSummaryRequestRepository(),
    ).create({ ...input.data, userId: user.id });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateSummaryRequestError) {
      return apiError(request, error.code, error.message, error.status, { existing: error.existing });
    }
    return authErrorResponse(error, request);
  }
}
