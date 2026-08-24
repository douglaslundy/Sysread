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

const schema = z.object({
  contentId: z.string().min(1),
  mode: z.enum(["continuous", "focus"]),
}).strict();

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the reading session." , 400 );
    }
    const session = await new ReadingSessionService(
      new MongoReadingSessionRepository(),
      new MongoReaderRepository(),
    ).start({ ...input.data, userId: user.id });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof ReadingSessionError) {
      return apiError(request, error.code, error.message , 404 );
    }
    return authErrorResponse(error, request);
  }
}
