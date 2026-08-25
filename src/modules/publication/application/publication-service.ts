import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { UserModel } from "@/modules/users/infrastructure/user.model";
import { PublicationRequestModel } from "../infrastructure/publication-request.model";

export type PublicationRequestRow = {
  contentId: string;
  decidedAt?: string;
  id: string;
  justification?: string;
  processingStatus: string;
  requestedAt: string;
  requesterEmail?: string;
  requesterName?: string;
  sourceType: string;
  status: "approved" | "pending" | "rejected";
  title: string;
};

export class PublicationRequestError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "REQUEST_NOT_FOUND", readonly statusCode: number) {
    super(code);
  }
}

export async function createPublicationRequest(input: {
  contentId: Types.ObjectId;
  requesterId: Types.ObjectId;
  requesterRole: "admin" | "user";
}) {
  await connectToMongo();
  const direct = input.requesterRole === "admin";
  const now = new Date();
  await PublicationRequestModel.updateOne(
    { contentId: input.contentId },
    {
      $setOnInsert: {
        contentId: input.contentId,
        ...(direct ? {
          decidedAt: now,
          decidedBy: input.requesterId,
          justification: "Publicação direta realizada por administrador.",
        } : {}),
        requesterId: input.requesterId,
        requesterRole: input.requesterRole,
        status: direct ? "approved" : "pending",
      },
    },
    { upsert: true },
  ).exec();
}

export async function publishApprovedContent(contentId: Types.ObjectId) {
  const request = await PublicationRequestModel.findOne({ contentId, status: "approved" }).lean().exec();
  if (!request) return false;
  const result = await ContentModel.updateOne(
    { _id: contentId, processingStatus: "ready" },
    {
      $set: {
        kind: "public",
        publishedAt: new Date(),
        visibility: "public",
      },
    },
  ).exec();
  return result.modifiedCount > 0;
}

async function rows(query: Record<string, unknown>): Promise<PublicationRequestRow[]> {
  await connectToMongo();
  const requests = await PublicationRequestModel.find(query).sort({ createdAt: -1 }).limit(500).lean().exec();
  const contentIds = requests.map((item) => item.contentId);
  const requesterIds = requests.map((item) => item.requesterId);
  const [contents, users] = await Promise.all([
    ContentModel.find({ _id: { $in: contentIds } }).select("processingStatus sourceType title").lean().exec(),
    UserModel.find({ _id: { $in: requesterIds } }).select("emailNormalized name").lean().exec(),
  ]);
  const contentById = new Map(contents.map((item) => [item._id.toString(), item]));
  const userById = new Map(users.map((item) => [item._id.toString(), item]));
  return requests.flatMap((request) => {
    const content = contentById.get(request.contentId.toString());
    if (!content) return [];
    const requester = userById.get(request.requesterId.toString());
    return [{
      contentId: content._id.toString(),
      decidedAt: request.decidedAt?.toISOString(),
      id: request._id.toString(),
      justification: request.justification,
      processingStatus: content.processingStatus,
      requestedAt: request.createdAt.toISOString(),
      requesterEmail: requester?.emailNormalized,
      requesterName: requester?.name,
      sourceType: content.sourceType,
      status: request.status,
      title: content.title,
    }];
  });
}

export const listAdminPublicationRequests = () => rows({});

export function listOwnPublicationRequests(requesterId: string) {
  if (!Types.ObjectId.isValid(requesterId)) return Promise.resolve([]);
  return rows({ requesterId: new Types.ObjectId(requesterId) });
}

export async function decidePublicationRequest(input: {
  adminId: string;
  decision: "approved" | "rejected";
  justification: string;
  requestId: string;
}) {
  if (!Types.ObjectId.isValid(input.adminId) || !Types.ObjectId.isValid(input.requestId)) {
    throw new PublicationRequestError("REQUEST_NOT_FOUND", 404);
  }
  await connectToMongo();
  const request = await PublicationRequestModel.findOneAndUpdate(
    { _id: new Types.ObjectId(input.requestId), status: "pending" },
    {
      $set: {
        decidedAt: new Date(),
        decidedBy: new Types.ObjectId(input.adminId),
        justification: input.justification.trim(),
        status: input.decision,
      },
    },
    { returnDocument: "after", runValidators: true },
  ).exec();
  if (!request) throw new PublicationRequestError("REQUEST_NOT_FOUND", 404);
  if (input.decision === "approved") await publishApprovedContent(request.contentId);
  return { status: request.status };
}
