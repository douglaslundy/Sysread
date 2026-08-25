import { Types } from "mongoose";
import { apiError } from "@/lib/api-response";
import { getServerEnv } from "@/lib/env";
import { connectToMongo } from "@/lib/db/mongodb";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { createPrivateObjectStorage } from "@/modules/imports/infrastructure/private-storage-factory";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return apiError(request, "COVER_NOT_FOUND", "Cover not found.", 404);
    await connectToMongo();
    const contentId = new Types.ObjectId(id);
    let content = await ContentModel.findOne({
      _id: contentId,
      processingStatus: "ready",
      visibility: "public",
    }).exec();
    if (!content) {
      const user = await requireActiveRequestUser(request);
      content = await ContentModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId: new Types.ObjectId(user.id),
      visibility: "private",
      }).exec();
    }
    if (!content) return apiError(request, "COVER_NOT_FOUND", "Cover not found.", 404);
    const storageKey = content.sourceMetadata.coverStorageKey;
    const mimeType = content.sourceMetadata.coverMimeType;
    if (typeof storageKey !== "string" || typeof mimeType !== "string") {
      return apiError(request, "COVER_NOT_FOUND", "Cover not found.", 404);
    }
    const bytes = await createPrivateObjectStorage(getServerEnv()).get(storageKey);
    return new Response(Buffer.from(bytes), {
      headers: {
        "cache-control": content.visibility === "public" ? "public, max-age=3600" : "private, max-age=3600",
        "content-type": mimeType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
