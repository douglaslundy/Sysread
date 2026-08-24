import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import type { ClaimedJob, JobRepository, JobView } from "../application/types";
import { JobModel, type JobKind } from "./job.model";

function activeLock(job: ClaimedJob) {
  return { _id: new Types.ObjectId(job.id), lockToken: job.lockToken, state: "processing" as const };
}

export class MongoJobRepository implements JobRepository {
  async claimNext(input: { kinds: JobKind[]; leaseMs: number; now: Date }) {
    await connectToMongo();
    if (input.kinds.length === 0) return null;
    const lockToken = randomUUID();
    const job = await JobModel.findOneAndUpdate(
      {
        kind: { $in: input.kinds },
        $or: [
          { nextAttemptAt: { $lte: input.now }, state: "queued" },
          { leaseExpiresAt: { $lte: input.now }, state: "processing" },
        ],
      },
      {
        $inc: { attempts: 1 },
        $set: {
          leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
          lockedAt: input.now,
          lockToken,
          state: "processing",
          statusCode: "PROCESSING",
        },
        $unset: { errorCode: 1, errorMessage: 1 },
      },
      { returnDocument: "after", sort: { nextAttemptAt: 1, createdAt: 1 } },
    ).exec();
    if (!job) return null;
    return {
      attempts: job.attempts,
      id: job._id.toString(),
      kind: job.kind,
      lockToken,
      maxAttempts: job.maxAttempts,
      ownerId: job.ownerId.toString(),
      subjectId: job.subjectId.toString(),
    };
  }

  async reportProgress(
    job: ClaimedJob,
    progress: number,
    statusCode: string,
    now: Date,
    leaseMs: number,
  ) {
    await connectToMongo();
    const result = await JobModel.updateOne(
      { ...activeLock(job), progress: { $lte: progress } },
      {
        $set: {
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          progress,
          statusCode,
        },
      },
    ).exec();
    return result.modifiedCount === 1;
  }

  async complete(job: ClaimedJob, now: Date) {
    await connectToMongo();
    const result = await JobModel.updateOne(
      activeLock(job),
      {
        $set: { completedAt: now, progress: 100, state: "completed", statusCode: "COMPLETED" },
        $unset: { leaseExpiresAt: 1, lockedAt: 1, lockToken: 1 },
      },
    ).exec();
    return result.modifiedCount === 1;
  }

  async retry(
    job: ClaimedJob,
    error: { code: string; message: string },
    nextAttemptAt: Date,
  ) {
    await connectToMongo();
    const result = await JobModel.updateOne(
      activeLock(job),
      {
        $set: {
          errorCode: error.code,
          errorMessage: error.message,
          nextAttemptAt,
          state: "queued",
          statusCode: "RETRY_SCHEDULED",
        },
        $unset: { leaseExpiresAt: 1, lockedAt: 1, lockToken: 1 },
      },
    ).exec();
    return result.modifiedCount === 1;
  }

  async deadLetter(
    job: ClaimedJob,
    error: { code: string; message: string },
    now: Date,
  ) {
    await connectToMongo();
    const result = await JobModel.updateOne(
      activeLock(job),
      {
        $set: {
          deadLetteredAt: now,
          errorCode: error.code,
          errorMessage: error.message,
          state: "failed",
          statusCode: "FAILED",
        },
        $unset: { leaseExpiresAt: 1, lockedAt: 1, lockToken: 1 },
      },
    ).exec();
    if (result.modifiedCount === 1 && job.kind.startsWith("import_")) {
      await ContentModel.updateOne(
        { _id: new Types.ObjectId(job.subjectId), ownerId: new Types.ObjectId(job.ownerId) },
        { $set: { processingStatus: "failed" } },
      ).exec();
    }
    return result.modifiedCount === 1;
  }

  async findOwned(jobId: string, ownerId: string): Promise<JobView | null> {
    if (!Types.ObjectId.isValid(jobId) || !Types.ObjectId.isValid(ownerId)) return null;
    await connectToMongo();
    const job = await JobModel.findOne({
      _id: new Types.ObjectId(jobId),
      ownerId: new Types.ObjectId(ownerId),
    }).exec();
    if (!job) return null;
    return {
      attempts: job.attempts,
      completedAt: job.completedAt?.toISOString(),
      createdAt: job.createdAt.toISOString(),
      deadLetteredAt: job.deadLetteredAt?.toISOString(),
      error: job.errorCode
        ? { code: job.errorCode, message: job.errorMessage ?? "The job failed." }
        : undefined,
      id: job._id.toString(),
      kind: job.kind,
      maxAttempts: job.maxAttempts,
      progress: job.progress,
      state: job.state,
      statusCode: job.statusCode,
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
