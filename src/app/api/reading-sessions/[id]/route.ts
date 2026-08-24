import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import {
  ReadingSessionError,
  ReadingSessionService,
} from "@/modules/reader/application/reading-session-service";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";
import { MongoReadingSessionRepository } from "@/modules/reader/infrastructure/reading-session-repository";

const schema = z.object({ wordsRead: z.number().int().min(0).max(10_000_000) }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the reading session." , 400 );
    }
    const { id } = await context.params;
    const session = await new ReadingSessionService(
      new MongoReadingSessionRepository(),
      new MongoReaderRepository(),
    ).finish({ id, userId: user.id, wordsRead: input.data.wordsRead });
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof ReadingSessionError) {
      return apiError(request, error.code, error.message , 404 );
    }
    return authErrorResponse(error, request);
  }
}
