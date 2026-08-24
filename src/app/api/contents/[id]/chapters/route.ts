import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { ReaderError, ReaderService } from "@/modules/reader/application/reader-service";
import { readerErrorResponse } from "@/modules/reader/infrastructure/http";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    const chapters = await new ReaderService(new MongoReaderRepository()).listChapters(id, user.id);
    return NextResponse.json({ chapters });
  } catch (error) {
    if (error instanceof ReaderError) return readerErrorResponse(error, request);
    return authErrorResponse(error, request);
  }
}
