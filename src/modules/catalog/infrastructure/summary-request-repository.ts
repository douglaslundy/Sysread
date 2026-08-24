import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import {
  DuplicateSummaryRequestError,
  type CreateSummaryRequest,
  type SummaryRequestRecord,
  type SummaryRequestRepository,
} from "../application/summary-request-service";
import {
  SummaryRequestModel,
  type SummaryRequest,
} from "./summary-request.model";

function mapRequest(
  request: SummaryRequest & { _id: Types.ObjectId },
): SummaryRequestRecord {
  return {
    authorRequested: request.authorRequested,
    id: request._id.toString(),
    status: request.status,
    titleRequested: request.titleRequested,
    userId: request.userId.toString(),
  };
}

export class MongoSummaryRequestRepository
  implements SummaryRequestRepository
{
  async findDuplicate(
    input: CreateSummaryRequest,
  ): Promise<SummaryRequestRecord | null> {
    await connectToMongo();
    const request = await SummaryRequestModel.findOne({
      authorNormalized: input.authorNormalized,
      titleNormalized: input.titleNormalized,
      userId: new Types.ObjectId(input.userId),
    }).exec();
    return request ? mapRequest(request) : null;
  }

  async create(
    input: CreateSummaryRequest,
  ): Promise<SummaryRequestRecord> {
    await connectToMongo();

    try {
      const request = await SummaryRequestModel.create({
        ...input,
        userId: new Types.ObjectId(input.userId),
      });
      return mapRequest(request);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        const existing = await this.findDuplicate(input);
        if (existing) throw new DuplicateSummaryRequestError(existing);
      }
      throw error;
    }
  }
}