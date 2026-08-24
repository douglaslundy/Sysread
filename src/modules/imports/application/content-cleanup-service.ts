import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ChapterModel } from "../../catalog/infrastructure/chapter.model";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import { cleanupPreview, cleanupText, type CleanupLevel } from "../domain/text-cleanup";

export class CleanupContentError extends Error {
  constructor(readonly code: "CONTENT_NOT_FOUND" | "CHAPTER_NOT_FOUND") {
    super(code === "CONTENT_NOT_FOUND" ? "Content not found." : "Chapter not found.");
  }
}

const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const words = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;

async function ownedContent(contentId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(contentId) || !Types.ObjectId.isValid(ownerId)) return null;
  await connectToMongo();
  return ContentModel.findOne({ _id: new Types.ObjectId(contentId), ownerId: new Types.ObjectId(ownerId), kind: "personal" }).exec();
}

export async function previewContentCleanup(input: {
  chapterId?: string;
  contentId: string;
  level: CleanupLevel;
  ownerId: string;
}) {
  const content = await ownedContent(input.contentId, input.ownerId);
  if (!content) throw new CleanupContentError("CONTENT_NOT_FOUND");
  const query: Record<string, unknown> = { contentId: content._id };
  if (input.chapterId) {
    if (!Types.ObjectId.isValid(input.chapterId)) throw new CleanupContentError("CHAPTER_NOT_FOUND");
    query._id = new Types.ObjectId(input.chapterId);
  }
  const chapter = await ChapterModel.findOne(query).sort({ order: 1 }).exec();
  if (!chapter) throw new CleanupContentError("CHAPTER_NOT_FOUND");
  return {
    chapterId: chapter._id.toString(),
    level: input.level,
    ...cleanupPreview(chapter.sourceText ?? chapter.originalText, input.level),
  };
}

export async function applyContentCleanup(input: {
  contentId: string;
  level: CleanupLevel;
  ownerId: string;
}) {
  const content = await ownedContent(input.contentId, input.ownerId);
  if (!content) throw new CleanupContentError("CONTENT_NOT_FOUND");
  const chapters = await ChapterModel.find({ contentId: content._id }).sort({ order: 1 }).exec();
  for (const chapter of chapters) {
    const sourceText = chapter.sourceText ?? chapter.originalText;
    const cleaned = cleanupText(sourceText, input.level);
    await ChapterModel.updateOne(
      { _id: chapter._id, contentId: content._id },
      { $set: { normalizedTextHash: hash(cleaned), originalText: cleaned, sourceText, wordCount: words(cleaned) } },
    ).exec();
  }
  await ContentModel.updateOne(
    { _id: content._id, ownerId: content.ownerId },
    { $set: { cleanupLevel: input.level } },
  ).exec();
  return { chapterCount: chapters.length, level: input.level };
}