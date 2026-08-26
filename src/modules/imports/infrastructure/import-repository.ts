import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ContentModel } from "../../catalog/infrastructure/content.model";
import { JobModel } from "../../jobs/infrastructure/job.model";
import type {
  CreateImportRecord,
  ImportRepository,
  UploadedImport,
} from "../application/types";
import { UploadQuotaModel } from "./upload-quota.model";
import { createPublicationRequest } from "../../publication/application/publication-service";
import { PublicationRequestModel } from "../../publication/infrastructure/publication-request.model";

function mapJob(job: { _id: Types.ObjectId; subjectId: Types.ObjectId }): UploadedImport {
  return { contentId: job.subjectId.toString(), jobId: job._id.toString() };
}

export class MongoImportRepository implements ImportRepository {
  async findByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<UploadedImport | null> {
    await connectToMongo();
    const job = await JobModel.findOne({
      idempotencyKey,
      ownerId: new Types.ObjectId(ownerId),
    }).exec();
    return job ? mapJob(job) : null;
  }

  async reserveQuota(ownerId: string, bytes: number, limit: number) {
    await connectToMongo();
    const objectOwnerId = new Types.ObjectId(ownerId);
    await UploadQuotaModel.updateOne(
      { ownerId: objectOwnerId },
      { $setOnInsert: { usedBytes: 0 } },
      { upsert: true },
    ).exec();
    const quota = await UploadQuotaModel.findOneAndUpdate(
      { ownerId: objectOwnerId, usedBytes: { $lte: limit - bytes } },
      { $inc: { usedBytes: bytes } },
      { returnDocument: "after" },
    ).exec();
    return Boolean(quota);
  }

  async releaseQuota(ownerId: string, bytes: number) {
    await connectToMongo();
    await UploadQuotaModel.updateOne(
      { ownerId: new Types.ObjectId(ownerId), usedBytes: { $gte: bytes } },
      { $inc: { usedBytes: -bytes } },
    ).exec();
  }

  async create(input: CreateImportRecord) {
    await connectToMongo();
    const ownerId = new Types.ObjectId(input.ownerId);
    const prior = await JobModel.findOne({
      idempotencyKey: input.idempotencyKey,
      ownerId,
    }).exec();
    if (prior) return { ...mapJob(prior), created: false };

    const content = await ContentModel.create({
      category: input.category,
      cleanupLevel: "standard",
      kind: "personal",
      visibility: "private",
      ownerId,
      processingStatus: "uploaded",
      schemaVersion: 1,
      sourceMetadata: {
        byteSize: input.byteSize,
        contentOnly: input.contentOnly,
        sha256: input.sha256,
        storageKey: input.storageKey,
        visibility: "private",
      },
      sourceType: {
        epub: "upload_epub" as const,
        mobi: "upload_mobi" as const,
        pdf: "upload_pdf" as const,
      }[input.kind],
      title: input.title,
    });

    try {
      if (input.publicationRequested) {
        await createPublicationRequest({ contentId: content._id, requesterId: ownerId, requesterRole: input.requesterRole });
      }
      const job = await JobModel.create({
        idempotencyKey: input.idempotencyKey,
        kind: {
          epub: "import_epub" as const,
          mobi: "import_mobi" as const,
          pdf: "import_pdf" as const,
        }[input.kind],
        ownerId,
        subjectId: content._id,
      });
      return { contentId: content._id.toString(), jobId: job._id.toString(), created: true };
    } catch (error) {
      await Promise.all([
        ContentModel.deleteOne({ _id: content._id, ownerId }).exec(),
        PublicationRequestModel.deleteMany({ contentId: content._id }).exec(),
      ]);
      const concurrent = await JobModel.findOne({
        idempotencyKey: input.idempotencyKey,
        ownerId,
      }).exec();
      if (concurrent) return { ...mapJob(concurrent), created: false };
      throw error;
    }
  }
}
