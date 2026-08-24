import { Types } from "mongoose";
import { getRuntimeSettings } from "@/modules/admin/application/platform-settings";
import { logEvent } from "@/lib/observability";
import { ChapterModel } from "@/modules/catalog/infrastructure/chapter.model";
import { JobExecutionError } from "@/modules/jobs/application/job-runner";
import type { JobHandler } from "@/modules/jobs/application/types";
import {

  SIMPLIFICATION_PROMPT_VERSION,
  SimplificationError,
  simplifyChapterText,
} from "../application/simplification-service";
import { OpenAiSimplificationProvider } from "./openai-simplification-provider";

export function createSimplificationHandler(port?: OpenAiSimplificationProvider): JobHandler {
  return async (job, context) => {
    const settings = await getRuntimeSettings();
    const provider = port ?? (
      settings.ai.apiKey
        ? new OpenAiSimplificationProvider(settings.ai.apiKey, settings.ai.model)
        : null
    );
    if (!provider) throw new JobExecutionError("AI_NOT_CONFIGURED", false, "AI provider is not configured.");
    const chapter = await ChapterModel.findById(new Types.ObjectId(job.subjectId)).exec();
    if (!chapter) throw new JobExecutionError("CHAPTER_NOT_FOUND", false, "Chapter no longer exists.");
    const sourceHash = chapter.normalizedTextHash;
    await context.reportProgress(15, "AI_PREPARING");
    try {
      const result = await simplifyChapterText(provider, chapter.originalText);
      await context.reportProgress(85, "AI_SAVING");
      logEvent({ event: "ai_simplification_completed", fields: { jobId: job.id, model: settings.ai.model, totalTokens: result.usage.totalTokens } });
      const updated = await ChapterModel.updateOne(
        {
          _id: chapter._id,
          simplifiedVariants: {
            $elemMatch: {
              model: settings.ai.model,
              promptVersion: SIMPLIFICATION_PROMPT_VERSION,
              sourceHash,
            },
          },
        },
        {
          $set: {
            "simplifiedVariants.$.content": result.simplifiedText,
            "simplifiedVariants.$.generatedAt": new Date(),
            "simplifiedVariants.$.inputTokens": result.usage.inputTokens,
            "simplifiedVariants.$.outputTokens": result.usage.outputTokens,
            "simplifiedVariants.$.status": "ready",
            "simplifiedVariants.$.totalTokens": result.usage.totalTokens,
          },
        },
      ).exec();
      if (updated.modifiedCount !== 1) {
        throw new JobExecutionError("CHAPTER_CHANGED", false, "Chapter changed during simplification.");
      }
    } catch (error) {
      if (job.attempts >= job.maxAttempts) {
        await ChapterModel.updateOne(
          { _id: chapter._id },
          { $set: { "simplifiedVariants.$[item].status": "failed" } },
          { arrayFilters: [{ "item.model": settings.ai.model, "item.promptVersion": SIMPLIFICATION_PROMPT_VERSION, "item.sourceHash": sourceHash }] },
        ).exec();
      }
      if (error instanceof JobExecutionError) throw error;
      if (error instanceof SimplificationError) {
        throw new JobExecutionError(error.code, error.retryable, error.message);
      }
      throw error;
    }
  };
}
