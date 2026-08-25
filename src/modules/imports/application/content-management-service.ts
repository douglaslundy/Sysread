import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ChapterModel } from "../../catalog/infrastructure/chapter.model";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import { JobModel } from "../../jobs/infrastructure/job.model";
import { ReadingProgressModel } from "../../reader/infrastructure/reading-progress.model";
import { ReadingSessionModel } from "../../reader/infrastructure/reading-session.model";
import type { PrivateObjectStorage } from "./types";
import { UploadQuotaModel } from "../infrastructure/upload-quota.model";
import { PublicationRequestModel } from "../../publication/infrastructure/publication-request.model";

export class ContentManagementError extends Error {
  constructor(
    readonly code: "CONTENT_NOT_FOUND" | "CHAPTER_NOT_FOUND" | "INVALID_CONTENT",
    readonly status: number,
  ) {
    super(code === "INVALID_CONTENT" ? "The content is invalid." : "The material was not found.");
  }
}

const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;

function objectIds(contentId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(contentId) || !Types.ObjectId.isValid(ownerId)) return null;
  return {
    contentId: new Types.ObjectId(contentId),
    ownerId: new Types.ObjectId(ownerId),
  };
}

export async function updateOwnedChapter(input: {
  chapterId: string;
  contentId: string;
  ownerId: string;
  text: string;
  title: string;
}) {
  const ids = objectIds(input.contentId, input.ownerId);
  if (!ids || !Types.ObjectId.isValid(input.chapterId)) {
    throw new ContentManagementError("CONTENT_NOT_FOUND", 404);
  }
  const text = input.text.replace(/\r\n?/gu, "\n").trim();
  const title = input.title.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  if (!text || text.length > 5_000_000 || !title || title.length > 500) {
    throw new ContentManagementError("INVALID_CONTENT", 400);
  }

  await connectToMongo();
  const content = await ContentModel.findOne({
    _id: ids.contentId,
    kind: "personal",
    ownerId: ids.ownerId,
    processingStatus: "ready",
  }).exec();
  if (!content) throw new ContentManagementError("CONTENT_NOT_FOUND", 404);

  const chapter = await ChapterModel.findOneAndUpdate(
    { _id: new Types.ObjectId(input.chapterId), contentId: ids.contentId },
    {
      $set: {
        normalizedTextHash: hash(text),
        originalText: text,
        simplifiedVariants: [],
        sourceText: text,
        title,
        wordCount: wordCount(text),
      },
    },
    { returnDocument: "after" },
  ).exec();
  if (!chapter) throw new ContentManagementError("CHAPTER_NOT_FOUND", 404);

  await Promise.all([
    ContentModel.updateOne(
      { _id: ids.contentId, ownerId: ids.ownerId },
      { $set: { "sourceMetadata.lastEditedAt": new Date() } },
    ).exec(),
    ReadingProgressModel.deleteMany({ chapterId: chapter._id, contentId: ids.contentId }).exec(),
  ]);

  return {
    id: chapter._id.toString(),
    order: chapter.order,
    text: chapter.originalText,
    textVersionHash: chapter.normalizedTextHash,
    title: chapter.title,
    variant: "original" as const,
    wordCount: chapter.wordCount,
  };
}

export async function deleteOwnedContent(input: {
  contentId: string;
  ownerId: string;
  storage: PrivateObjectStorage;
}) {
  const ids = objectIds(input.contentId, input.ownerId);
  if (!ids) throw new ContentManagementError("CONTENT_NOT_FOUND", 404);
  await connectToMongo();
  const content = await ContentModel.findOne({
    _id: ids.contentId,
    kind: "personal",
    ownerId: ids.ownerId,
  }).exec();
  if (!content) throw new ContentManagementError("CONTENT_NOT_FOUND", 404);

  const storageKeys = [
    content.sourceMetadata.storageKey,
    content.sourceMetadata.coverStorageKey,
  ].filter((value): value is string => typeof value === "string");
  const byteSize = typeof content.sourceMetadata.byteSize === "number"
    ? content.sourceMetadata.byteSize
    : 0;

  await Promise.all([
    ChapterModel.deleteMany({ contentId: ids.contentId }).exec(),
    JobModel.deleteMany({ ownerId: ids.ownerId, subjectId: ids.contentId }).exec(),
    PublicationRequestModel.deleteMany({ contentId: ids.contentId }).exec(),
    ReadingProgressModel.deleteMany({ contentId: ids.contentId }).exec(),
    ReadingSessionModel.deleteMany({ contentId: ids.contentId }).exec(),
  ]);
  await ContentModel.deleteOne({ _id: ids.contentId, ownerId: ids.ownerId }).exec();
  if (byteSize > 0) {
    await UploadQuotaModel.updateOne(
      { ownerId: ids.ownerId, usedBytes: { $gte: byteSize } },
      { $inc: { usedBytes: -byteSize } },
    ).exec();
  }
  await Promise.all(storageKeys.map((storageKey) =>
    input.storage.delete(storageKey).catch(() => undefined),
  ));

  return { deleted: true };
}
