import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ChapterModel, type Chapter } from "../../catalog/infrastructure/chapter.model";
import { ContentModel, type Content } from "../../catalog/infrastructure/content.model";
import type { ReaderChapter, ReaderChapterSummary, ReaderContent, ReaderRepository, TextVariant } from "../application/types";

export function readableContentQuery(contentId: string, actorUserId: string) {
  if (!Types.ObjectId.isValid(contentId) || !Types.ObjectId.isValid(actorUserId)) return null;
  return {
    _id: new Types.ObjectId(contentId),
    processingStatus: "ready" as const,
    $or: [
      { visibility: "private" as const, ownerId: new Types.ObjectId(actorUserId) },
      { visibility: "public" as const, publishedAt: { $ne: null } },
    ],
  };
}
function mapContent(content: Content): ReaderContent {
  return {
    author: content.author, category: content.category, cleanupLevel: content.cleanupLevel,
    coverUrl: content.coverUrl, id: (content as Content & { _id: Types.ObjectId })._id.toString(),
    kind: content.kind, processingStatus: "ready", sourceType: content.sourceType,
    title: content.title, updatedAt: content.updatedAt.toISOString(),
  };
}
function mapSummary(chapter: Chapter): ReaderChapterSummary {
  return {
    id: (chapter as Chapter & { _id: Types.ObjectId })._id.toString(),
    order: chapter.order, title: chapter.title, wordCount: chapter.wordCount,
  };
}
export class MongoReaderRepository implements ReaderRepository {
  async findReadableContent(contentId: string, actorUserId: string): Promise<ReaderContent | null> {
    const query = readableContentQuery(contentId, actorUserId);
    if (!query) return null;
    await connectToMongo();
    const content = await ContentModel.findOne(query).exec();
    return content ? mapContent(content) : null;
  }
  async listChapters(contentId: string): Promise<ReaderChapterSummary[]> {
    if (!Types.ObjectId.isValid(contentId)) return [];
    await connectToMongo();
    const chapters = await ChapterModel.find({ contentId: new Types.ObjectId(contentId) }).sort({ order: 1, _id: 1 }).exec();
    return chapters.map(mapSummary);
  }
  async findChapter(contentId: string, chapterId: string, variant: TextVariant): Promise<ReaderChapter | "VARIANT_NOT_READY" | null> {
    if (!Types.ObjectId.isValid(contentId) || !Types.ObjectId.isValid(chapterId)) return null;
    await connectToMongo();
    const chapter = await ChapterModel.findOne({ _id: new Types.ObjectId(chapterId), contentId: new Types.ObjectId(contentId) }).exec();
    if (!chapter) return null;
    let text = chapter.originalText;
    if (variant === "simplified") {
      const simplified = [...chapter.simplifiedVariants].reverse().find((item) =>
        item.status === "ready" && item.sourceHash === chapter.normalizedTextHash && typeof item.content === "string"
      );
      if (!simplified?.content) return "VARIANT_NOT_READY";
      text = simplified.content;
    }
    return {
      ...mapSummary(chapter),
      text,
      textVersionHash:
        variant === "original"
          ? chapter.normalizedTextHash
          : createHash("sha256").update(text, "utf8").digest("hex"),
      variant,
    };
  }
}
