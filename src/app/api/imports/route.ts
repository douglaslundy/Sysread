import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getServerEnv } from "@/lib/env";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import {
  UploadImportService,
  UploadValidationError,
} from "@/modules/imports/application/upload-import-service";
import { MongoImportRepository } from "@/modules/imports/infrastructure/import-repository";
import { createPrivateObjectStorage } from "@/modules/imports/infrastructure/private-storage-factory";
import { consumeRateLimit, rateLimitResponse } from "@/modules/security/infrastructure/rate-limit";

export const runtime = "nodejs";

function uploadError(request: Request, error: UploadValidationError) {
  return apiError(request, error.code, error.message , error.status );
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const rate = await consumeRateLimit({ identity: user.id, limit: 20, scope: "imports", windowMs: 60 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(request, rate.retryAfterSeconds);
    const env = getServerEnv();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > env.MAX_UPLOAD_BYTES + 1024 * 1024) {
      return uploadError(
        request,
        new UploadValidationError(
          "FILE_TOO_LARGE",
          413,
          "The request exceeds the upload limit.",
        ),
      );
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return uploadError(
        request,
        new UploadValidationError(
          "INVALID_FILE",
          415,
          "A PDF, EPUB or MOBI file is required.",
        ),
      );
    }

    const result = await new UploadImportService(
      new MongoImportRepository(),
      createPrivateObjectStorage(env),
      {
        maxFileBytes: env.MAX_UPLOAD_BYTES,
        quotaBytes: env.USER_UPLOAD_QUOTA_BYTES,
      },
    ).create({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      ownerId: user.id,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof UploadValidationError) return uploadError(request, error);
    return authErrorResponse(error, request);
  }
}
