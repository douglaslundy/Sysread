import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import { JobModel } from "../../jobs/infrastructure/job.model";
import { validatePublicUrl } from "./safe-http-fetch";

export async function createUrlImport(owner: string, value: string) {
  const url = validatePublicUrl(value).toString();
  const ownerId = new Types.ObjectId(owner);
  const idempotencyKey = `url:${owner}:${createHash("sha256").update(url).digest("hex")}`;
  await connectToMongo();
  const existing = await JobModel.findOne({ idempotencyKey, ownerId }).exec();
  if (existing) {
    if (existing.state === "failed") {
      await Promise.all([
        JobModel.updateOne({ _id: existing._id, state: "failed" }, {
          $set: { attempts: 0, nextAttemptAt: new Date(), progress: 0, state: "queued", statusCode: "QUEUED" },
          $unset: { completedAt: 1, deadLetteredAt: 1, errorCode: 1, errorMessage: 1, leaseExpiresAt: 1, lockedAt: 1, lockToken: 1 },
        }),
        ContentModel.updateOne({ _id: existing.subjectId, ownerId }, { $set: { processingStatus: "uploaded" } }),
      ]);
    }
    return { contentId: existing.subjectId.toString(), jobId: existing._id.toString() };
  }
  const content = await ContentModel.create({
    cleanupLevel: "standard",
    kind: "personal",
    ownerId,
    processingStatus: "uploaded",
    schemaVersion: 1,
    sourceMetadata: { sourceUrl: url, visibility: "private" },
    sourceType: "link_article",
    title: new URL(url).hostname,
    visibility: "private",
  });
  try {
    const job = await JobModel.create({ idempotencyKey, kind: "import_url", ownerId, subjectId: content._id });
    return { contentId: content._id.toString(), jobId: job._id.toString() };
  } catch (error) {
    await ContentModel.deleteOne({ _id: content._id, ownerId }).exec();
    const concurrent = await JobModel.findOne({ idempotencyKey, ownerId }).exec();
    if (concurrent) return { contentId: concurrent.subjectId.toString(), jobId: concurrent._id.toString() };
    throw error;
  }
}
