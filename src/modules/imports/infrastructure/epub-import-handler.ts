import { createHash } from "node:crypto";
import { Types } from "mongoose";
import type { JobHandler } from "../../jobs/application/types";
import { JobExecutionError } from "../../jobs/application/job-runner";
import { ChapterModel } from "../../catalog/infrastructure/chapter.model";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import type { PrivateObjectStorage } from "../application/types";
import { contentOnlyChapters } from "../domain/content-only";
import { EpubParseError, parseEpub } from "../domain/epub-parser";
import { cleanupText } from "../domain/text-cleanup";
import { discardRejectedUpload } from "./rejected-upload-cleanup";
import { publishApprovedContent } from "../../publication/application/publication-service";

const countWords = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;
const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function createEpubImportHandler(storage: PrivateObjectStorage): JobHandler {
  return async (job, context) => {
    const contentId = new Types.ObjectId(job.subjectId);
    const ownerId = new Types.ObjectId(job.ownerId);
    const content = await ContentModel.findOne({
      _id: contentId,
      ownerId,
      sourceType: "upload_epub",
    }).exec();
    if (!content) {
      throw new JobExecutionError("CONTENT_NOT_FOUND", false, "The uploaded content no longer exists.");
    }
    const storageKey = content.sourceMetadata.storageKey;
    if (typeof storageKey !== "string") {
      throw new JobExecutionError("STORAGE_KEY_MISSING", false, "The private source file is unavailable.");
    }

    await ContentModel.updateOne(
      { _id: contentId, ownerId },
      { $set: { processingStatus: "processing" } },
    ).exec();
    await context.reportProgress(10, "READING_PRIVATE_SOURCE");

    let bytes: Uint8Array;
    try {
      bytes = await storage.get(storageKey);
    } catch {
      throw new JobExecutionError("STORAGE_READ_FAILED", true, "The private source could not be read.");
    }
    await context.reportProgress(30, "PARSING_EPUB");

    let parsed;
    try {
      parsed = parseEpub(bytes);
    } catch (error) {
      if (error instanceof EpubParseError) {
        await discardRejectedUpload({
          contentId,
          ownerId,
          sourceMetadata: content.sourceMetadata,
          storage,
        });
        throw new JobExecutionError(error.code, false, error.message);
      }
      throw error;
    }
    await context.reportProgress(70, "SAVING_CHAPTERS");
    const chapters = content.sourceMetadata.contentOnly === true
      ? contentOnlyChapters(parsed.chapters)
      : parsed.chapters;

    for (const [order, chapter] of chapters.entries()) {
      const cleanedText = cleanupText(chapter.text, content.cleanupLevel);
      await ChapterModel.updateOne(
        { contentId, order },
        {
          $set: {
            normalizedTextHash: hash(cleanedText),
            originalText: cleanedText,
            sourceText: chapter.text,
            schemaVersion: 1,
            simplifiedVariants: [],
            title: chapter.title,
            wordCount: countWords(cleanedText),
          },
        },
        { upsert: true },
      ).exec();
    }
    await ChapterModel.deleteMany({ contentId, order: { $gte: chapters.length } }).exec();

    let coverMetadata: Record<string, string> = {};
    if (parsed.cover) {
      const coverStorageKey = `${job.ownerId}/${job.subjectId}.cover.${parsed.cover.extension}`;
      await storage.put({
        bytes: parsed.cover.bytes,
        contentType: parsed.cover.mimeType,
        storageKey: coverStorageKey,
      });
      coverMetadata = {
        "sourceMetadata.coverMimeType": parsed.cover.mimeType,
        "sourceMetadata.coverStorageKey": coverStorageKey,
      };
    }

    await ContentModel.updateOne(
      { _id: contentId, ownerId },
      {
        $set: {
          ...(parsed.author ? { author: parsed.author.slice(0, 240) } : {}),
          ...(parsed.title ? { title: parsed.title.slice(0, 500) } : {}),
          ...coverMetadata,
          coverUrl: "/covers/import-placeholder.svg",
          processingStatus: "ready",
          "sourceMetadata.parserVersion": "epub-v1",
        },
      },
    ).exec();
    await publishApprovedContent(contentId);
    await context.reportProgress(95, "FINALIZING");
  };
}
