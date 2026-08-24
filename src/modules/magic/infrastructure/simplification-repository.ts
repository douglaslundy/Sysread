import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/env";
import { ChapterModel } from "@/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { JobModel } from "@/modules/jobs/infrastructure/job.model";
import { readableContentQuery } from "@/modules/reader/infrastructure/reader-repository";
import {

  SIMPLIFICATION_PROMPT_VERSION,
  simplificationCacheKey,
} from "../application/simplification-service";
import type { SimplificationRequestResult } from "../application/types";

export class SimplificationRequestError extends Error {
  constructor(readonly code: "AI_LIMIT", message: string) {
    super(message);
  }
}

export class MongoSimplificationRepository {
  async request(input: {
    actorUserId: string;
    chapterId: string;
  }): Promise<SimplificationRequestResult | null> {
    if (!Types.ObjectId.isValid(input.actorUserId) || !Types.ObjectId.isValid(input.chapterId)) return null;
    await connectToMongo();
    const chapterId = new Types.ObjectId(input.chapterId);
    const ownerId = new Types.ObjectId(input.actorUserId);
    const chapter = await ChapterModel.findById(chapterId).exec();
    if (!chapter) return null;
    const readable = readableContentQuery(chapter.contentId.toString(), input.actorUserId);
    if (!readable || !await ContentModel.exists(readable)) return null;

    const model = getServerEnv().AI_MODEL;
    const identity = {
      model,
      promptVersion: SIMPLIFICATION_PROMPT_VERSION,
      sourceHash: chapter.normalizedTextHash,
    };
    const cached = chapter.simplifiedVariants.find((item) =>
      item.status === "ready" &&
      item.model === identity.model &&
      item.promptVersion === identity.promptVersion &&
      item.sourceHash === identity.sourceHash
    );
    if (cached) return { state: "ready" };

    const idempotencyKey = simplificationCacheKey(input.chapterId, chapter.normalizedTextHash, model);
    let job = await JobModel.findOne({ idempotencyKey }).exec();

    if (job?.state === "failed") {
      job.attempts = 0;
      job.nextAttemptAt = new Date();
      job.state = "queued";
      job.statusCode = "QUEUED";
      job.errorCode = undefined;
      job.errorMessage = undefined;
      await job.save();
      await ChapterModel.updateOne(
        { _id: chapterId },
        { $set: { "simplifiedVariants.$[item].status": "pending" } },
        { arrayFilters: [{
          "item.model": identity.model,
          "item.promptVersion": identity.promptVersion,
          "item.sourceHash": identity.sourceHash,
        }] },
      ).exec();
    }

    if (!job) {
      const recent = await JobModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 86_400_000) },
        kind: "simplify",
        ownerId,
      }).exec();
      if (recent >= 20) {
        throw new SimplificationRequestError("AI_LIMIT", "Daily simplification limit reached.");
      }
      if (!chapter.simplifiedVariants.some((item) =>
        item.model === identity.model &&
        item.promptVersion === identity.promptVersion &&
        item.sourceHash === identity.sourceHash
      )) {
        chapter.simplifiedVariants.push({ ...identity, status: "pending" });
        await chapter.save();
      }
      try {
        job = await JobModel.create({ idempotencyKey, kind: "simplify", ownerId, subjectId: chapterId });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        job = await JobModel.findOne({ idempotencyKey }).exec();
      }
    }
    if (!job) throw new Error("Simplification job could not be created.");
    return {
      jobId: job._id.toString(),
      state: job.state === "processing" ? "processing" : job.state === "completed" ? "ready" : "queued",
    };
  }
}
