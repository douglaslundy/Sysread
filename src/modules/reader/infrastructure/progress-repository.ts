import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import type { ProgressRepository, ReadingCheckpoint, SaveCheckpointInput } from "../application/progress-types";
import { ReadingProgressModel, type ReadingProgress } from "./reading-progress.model";

function mapProgress(progress: ReadingProgress): ReadingCheckpoint {
  return {
    chapterId: progress.chapterId.toString(),
    completed: progress.completed,
    contentId: progress.contentId.toString(),
    paragraphAnchor: progress.paragraphAnchor,
    percent: progress.percent,
    revision: progress.revision,
    textVariant: progress.textVariant,
    textVersionHash: progress.textVersionHash,
    updatedAt: progress.updatedAt.toISOString(),
    wordIndex: progress.wordIndex,
  };
}

function values(input: SaveCheckpointInput) {
  return {
    chapterId: new Types.ObjectId(input.chapterId),
    completed: input.completed,
    paragraphAnchor: input.paragraphAnchor,
    percent: input.percent,
    textVariant: input.textVariant,
    textVersionHash: input.textVersionHash,
    wordIndex: input.wordIndex,
  };
}

export class MongoProgressRepository implements ProgressRepository {
  async find(contentId: string, userId: string): Promise<ReadingCheckpoint | null> {
    if (!Types.ObjectId.isValid(contentId) || !Types.ObjectId.isValid(userId)) return null;
    await connectToMongo();
    const progress = await ReadingProgressModel.findOne({
      contentId: new Types.ObjectId(contentId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return progress ? mapProgress(progress) : null;
  }

  async save(input: SaveCheckpointInput): Promise<ReadingCheckpoint | "PROGRESS_CONFLICT"> {
    if (
      !Types.ObjectId.isValid(input.contentId) ||
      !Types.ObjectId.isValid(input.chapterId) ||
      !Types.ObjectId.isValid(input.userId)
    ) return "PROGRESS_CONFLICT";
    await connectToMongo();
    const contentId = new Types.ObjectId(input.contentId);
    const userId = new Types.ObjectId(input.userId);

    if (input.revision === 0) {
      const existing = await ReadingProgressModel.exists({ contentId, userId });
      if (existing) return "PROGRESS_CONFLICT";
      try {
        const created = await ReadingProgressModel.create({
          ...values(input),
          contentId,
          revision: 1,
          schemaVersion: 1,
          userId,
        });
        return mapProgress(created);
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return "PROGRESS_CONFLICT";
        throw error;
      }
    }

    const updated = await ReadingProgressModel.findOneAndUpdate(
      { contentId, revision: input.revision, userId },
      { $inc: { revision: 1 }, $set: values(input) },
      { returnDocument: "after" },
    ).exec();
    return updated ? mapProgress(updated) : "PROGRESS_CONFLICT";
  }
}
