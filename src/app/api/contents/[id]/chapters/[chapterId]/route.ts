import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { ReaderError, ReaderService } from "@/modules/reader/application/reader-service";
import { readerErrorResponse } from "@/modules/reader/infrastructure/http";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";
const querySchema = z.object({ variant: z.enum(["original", "simplified"]).default("original") });
export async function GET(request: Request, context: { params: Promise<{ chapterId: string; id: string }> }) {
  try {
    const user = await requireActiveRequestUser(request);
    const url = new URL(request.url);
    const query = querySchema.safeParse({ variant: url.searchParams.get("variant") ?? undefined });
    if (!query.success) return apiError(request, "INVALID_QUERY", "Choose a valid text version." , 400 );
    const { chapterId, id } = await context.params;
    const chapter = await new ReaderService(new MongoReaderRepository()).getChapter({
      actorUserId: user.id, chapterId, contentId: id, variant: query.data.variant,
    });
    return NextResponse.json({ chapter });
  } catch (error) {
    if (error instanceof ReaderError) return readerErrorResponse(error, request);
    return authErrorResponse(error, request);
  }
}
