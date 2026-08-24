import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { ProgressError, ProgressService } from "@/modules/reader/application/progress-service";
import { ReaderError } from "@/modules/reader/application/reader-service";
import { readerErrorResponse } from "@/modules/reader/infrastructure/http";
import { MongoProgressRepository } from "@/modules/reader/infrastructure/progress-repository";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";

const schema = z.object({
  chapterId: z.string().min(1),
  completed: z.boolean().optional(),
  paragraphAnchor: z.string().max(200).optional(),
  revision: z.number().int().min(0),
  textVariant: z.enum(["original", "simplified"]),
  textVersionHash: z.string().min(1).max(128),
  wordIndex: z.number().int().min(0),
});

function service() {
  return new ProgressService(new MongoReaderRepository(), new MongoProgressRepository());
}

function progressErrorResponse(request: Request, error: ProgressError) {
  return apiError(request, error.code, error.message , error.code === "PROGRESS_CONFLICT" ? 409 : 400 );
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    return NextResponse.json({ progress: await service().get(id, user.id) });
  } catch (error) {
    if (error instanceof ReaderError) return readerErrorResponse(error, request);
    return authErrorResponse(error, request);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Provide a valid reading checkpoint." , 400 );
    }
    const { id } = await context.params;
    const progress = await service().save({ ...input.data, contentId: id, userId: user.id });
    return NextResponse.json({ progress });
  } catch (error) {
    if (error instanceof ProgressError) return progressErrorResponse(request, error);
    if (error instanceof ReaderError) return readerErrorResponse(error, request);
    return authErrorResponse(error, request);
  }
}
