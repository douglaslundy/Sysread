import { Types } from "mongoose";
import { ChapterModel } from "../../catalog/infrastructure/chapter.model";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import type { PrivateObjectStorage } from "../application/types";
import { UploadQuotaModel } from "./upload-quota.model";
import { PublicationRequestModel } from "../../publication/infrastructure/publication-request.model";

export async function discardRejectedUpload(input: {
  contentId: Types.ObjectId;
  ownerId: Types.ObjectId;
  sourceMetadata: Record<string, unknown>;
  storage: PrivateObjectStorage;
}) {
  const storageKeys = [
    input.sourceMetadata.storageKey,
    input.sourceMetadata.coverStorageKey,
  ].filter((value): value is string => typeof value === "string");
  await Promise.all(storageKeys.map((key) => input.storage.delete(key).catch(() => undefined)));
  await Promise.all([
    ChapterModel.deleteMany({ contentId: input.contentId }).exec(),
    PublicationRequestModel.deleteMany({ contentId: input.contentId }).exec(),
    ContentModel.deleteOne({ _id: input.contentId, ownerId: input.ownerId }).exec(),
  ]);
  const byteSize = input.sourceMetadata.byteSize;
  if (typeof byteSize === "number" && byteSize > 0) {
    await UploadQuotaModel.updateOne(
      { ownerId: input.ownerId, usedBytes: { $gte: byteSize } },
      { $inc: { usedBytes: -byteSize } },
    ).exec();
  }
}
