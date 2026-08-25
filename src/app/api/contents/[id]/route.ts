import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getServerEnv } from "@/lib/env";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { ContentManagementError, deleteOwnedContent } from "@/modules/imports/application/content-management-service";
import { createPrivateObjectStorage } from "@/modules/imports/infrastructure/private-storage-factory";
import { ReaderError, ReaderService } from "@/modules/reader/application/reader-service";
import { readerErrorResponse } from "@/modules/reader/infrastructure/http";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    const content = await new ReaderService(new MongoReaderRepository()).getContent(id, user.id);
    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof ReaderError) return readerErrorResponse(error, request);
    return authErrorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    const result = await deleteOwnedContent({
      contentId: id,
      ownerId: user.id,
      storage: createPrivateObjectStorage(getServerEnv()),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ContentManagementError) {
      return apiError(request, error.code, error.message, error.status);
    }
    return authErrorResponse(error, request);
  }
}
