import { createHash } from "node:crypto";
import { Types } from "mongoose";
import type { JobHandler } from "../../jobs/application/types";
import { JobExecutionError } from "../../jobs/application/job-runner";
import { ChapterModel } from "../../catalog/infrastructure/chapter.model";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import { parseReadableArticle } from "../domain/article-parser";
import { cleanupText } from "../domain/text-cleanup";
import { decodeHtml, SafeFetchError, safeFetchHtml } from "./safe-http-fetch";

export function createUrlImportHandler(limits: { maxBytes: number; timeoutMs: number }): JobHandler {
  return async (job, context) => {
    const contentId = new Types.ObjectId(job.subjectId);
    const ownerId = new Types.ObjectId(job.ownerId);
    const content = await ContentModel.findOne({ _id: contentId, ownerId, sourceType: "link_article" }).exec();
    const sourceUrl = content?.sourceMetadata.sourceUrl;
    if (!content || typeof sourceUrl !== "string") throw new JobExecutionError("CONTENT_NOT_FOUND", false, "The article source is unavailable.");
    await ContentModel.updateOne({ _id: contentId, ownerId }, { $set: { processingStatus: "processing" } }).exec();
    await context.reportProgress(15, "FETCHING_ARTICLE");
    let fetched;
    try {
      fetched = await safeFetchHtml(sourceUrl, { maxBytes: limits.maxBytes, timeoutMs: limits.timeoutMs });
    } catch (error) {
      if (error instanceof SafeFetchError) throw new JobExecutionError(error.code, error.retryable, error.message);
      throw error;
    }
    await context.reportProgress(60, "EXTRACTING_ARTICLE");
    const article = parseReadableArticle(decodeHtml(fetched.bytes, fetched.contentType), fetched.finalUrl);
    if (!article) throw new JobExecutionError("PARSE_FAILED", false, "No readable article content was found.");
    const cleanedText = cleanupText(article.text, content.cleanupLevel);
    await ChapterModel.updateOne(
      { contentId, order: 0 },
      { $set: {
        normalizedTextHash: createHash("sha256").update(cleanedText).digest("hex"),
        originalText: cleanedText,
        sourceText: article.text,
        schemaVersion: 1,
        simplifiedVariants: [],
        title: article.title,
        wordCount: cleanedText.split(/\s+/u).filter(Boolean).length,
      } },
      { upsert: true },
    ).exec();
    await ChapterModel.deleteMany({ contentId, order: { $gt: 0 } }).exec();
    await ContentModel.updateOne({ _id: contentId, ownerId }, { $set: {
      ...(article.byline ? { author: article.byline.slice(0, 240) } : {}),
      coverUrl: "/covers/import-placeholder.svg",
      processingStatus: "ready",
      title: article.title,
      "sourceMetadata.finalUrl": fetched.finalUrl,
      ...(article.canonicalUrl ? { "sourceMetadata.canonicalUrl": article.canonicalUrl } : {}),
      "sourceMetadata.parserVersion": "readability-v1",
    } }).exec();
    await context.reportProgress(95, "FINALIZING");
  };
}
