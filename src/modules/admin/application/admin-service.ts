import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { ChapterModel } from "@/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { JobModel } from "@/modules/jobs/infrastructure/job.model";
import { ReadingProgressModel } from "@/modules/reader/infrastructure/reading-progress.model";
import { ReadingSessionModel } from "@/modules/reader/infrastructure/reading-session.model";
import { UserModel } from "@/modules/users/infrastructure/user.model";
import { PublicationRequestModel } from "@/modules/publication/infrastructure/publication-request.model";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export async function getAdminDashboard(now = new Date()) {
  await connectToMongo();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
  const activeAccess = {
    lifecycleStatus: "active" as const,
    $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: now } }],
  };
  const [totalUsers, activeUsers, blockedUsers, newUsers, expiredUsers, expiringUsers,
    totalContents, publicContents, privateContents, totalReadings, mostAccessed, recentUsers, registrations] = await Promise.all([
    UserModel.countDocuments({ lifecycleStatus: { $ne: "deleted" } }),
    UserModel.countDocuments(activeAccess),
    UserModel.countDocuments({ lifecycleStatus: "blocked" }),
    UserModel.countDocuments({ createdAt: { $gte: monthAgo } }),
    UserModel.countDocuments({ accessExpiresAt: { $lte: now }, lifecycleStatus: "active" }),
    UserModel.countDocuments({ accessExpiresAt: { $gt: now, $lte: soon }, lifecycleStatus: "active" }),
    ContentModel.countDocuments({}),
    ContentModel.countDocuments({ visibility: "public" }),
    ContentModel.countDocuments({ visibility: "private" }),
    ReadingSessionModel.countDocuments({}),
    ReadingSessionModel.aggregate<{ count: number; title: string }>([
      { $group: { _id: "$contentId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
      { $lookup: { from: "contents", localField: "_id", foreignField: "_id", as: "content" } },
      { $unwind: "$content" },
      { $project: { _id: 0, count: 1, title: "$content.title" } },
    ]),
    UserModel.find({ lifecycleStatus: "active", lastLoginAt: { $ne: null } })
      .sort({ lastLoginAt: -1 }).limit(5).select("name emailNormalized lastLoginAt").lean().exec(),
    UserModel.aggregate<{ count: number; date: string }>([
      { $match: { createdAt: { $gte: monthAgo } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $project: { _id: 0, count: 1, date: "$_id" } },
    ]),
  ]);
  return {
    metrics: { activeUsers, blockedUsers, expiredUsers, expiringUsers, newUsers, privateContents, publicContents, totalContents, totalReadings, totalUsers },
    mostAccessed,
    recentUsers: recentUsers.map((user) => ({ email: user.emailNormalized, lastLoginAt: user.lastLoginAt?.toISOString(), name: user.name })),
    registrations,
  };
}

export async function listAdminUsers(input: { search?: string; status?: string }) {
  await connectToMongo();
  const query: Record<string, unknown> = { lifecycleStatus: { $ne: "deleted" } };
  if (input.status === "active" || input.status === "blocked" || input.status === "deleting") query.lifecycleStatus = input.status;
  if (input.status === "expired") query.accessExpiresAt = { $lte: new Date() };
  if (input.search) {
    const pattern = new RegExp(escapeRegExp(input.search.trim().slice(0, 100)), "iu");
    query.$or = [{ emailNormalized: pattern }, { name: pattern }];
  }
  const users = await UserModel.find(query).sort({ createdAt: -1 }).limit(200).lean().exec();
  return users.map((user) => ({
    accessExpiresAt: user.accessExpiresAt?.toISOString(), createdAt: user.createdAt.toISOString(),
    email: user.emailNormalized, id: user._id.toString(), lastLoginAt: user.lastLoginAt?.toISOString(),
    name: user.name, role: user.role, status: user.lifecycleStatus,
  }));
}

export async function updateAdminUser(actorId: string, userId: string, input: { accessExpiresAt?: string | null; status?: "active" | "blocked" }) {
  if (!Types.ObjectId.isValid(userId)) return null;
  if (actorId === userId && input.status === "blocked") throw new Error("SELF_BLOCK_FORBIDDEN");
  const update: Record<string, unknown> = {};
  if (input.status) update.lifecycleStatus = input.status;
  if (input.accessExpiresAt === null) update.accessExpiresAt = null;
  else if (input.accessExpiresAt) update.accessExpiresAt = new Date(input.accessExpiresAt);
  const operation: Record<string, unknown> = { $set: update };
  if (input.status === "blocked") operation.$inc = { authVersion: 1 };
  await connectToMongo();
  return UserModel.findByIdAndUpdate(userId, operation, { returnDocument: "after", runValidators: true }).lean().exec();
}

export async function listAdminContents() {
  await connectToMongo();
  const contents = await ContentModel.find({}).sort({ updatedAt: -1 }).limit(300).lean().exec();
  const ownerIds = contents.flatMap((item) => item.ownerId ? [item.ownerId] : []);
  const owners = await UserModel.find({ _id: { $in: ownerIds } }).select("emailNormalized").lean().exec();
  const emails = new Map(owners.map((owner) => [owner._id.toString(), owner.emailNormalized]));
  return contents.map((content) => ({
    author: content.author, category: content.category, id: content._id.toString(),
    ownerEmail: content.ownerId ? emails.get(content.ownerId.toString()) : undefined,
    processingStatus: content.processingStatus, title: content.title,
    updatedAt: content.updatedAt.toISOString(), visibility: content.visibility,
  }));
}

export async function createAdminContent(input: { author?: string; assignedUserId?: string; category?: string; text: string; title: string; visibility: "private" | "public" }) {
  await connectToMongo();
  const ownerId = input.visibility === "private" && input.assignedUserId && Types.ObjectId.isValid(input.assignedUserId)
    ? new Types.ObjectId(input.assignedUserId) : null;
  if (input.visibility === "private" && !ownerId) throw new Error("ASSIGNEE_REQUIRED");
  const content = await ContentModel.create({
    author: input.author, category: input.category, cleanupLevel: "standard",
    kind: input.visibility === "public" ? "summary" : "personal", ownerId,
    processingStatus: "ready", publishedAt: input.visibility === "public" ? new Date() : undefined,
    schemaVersion: 2, sourceMetadata: { createdByAdmin: true },
    sourceType: input.visibility === "public" ? "readcoach_summary" : "admin_text",
    title: input.title, visibility: input.visibility,
  });
  const text = input.text.trim();
  await ChapterModel.create({ contentId: content._id, normalizedTextHash: createHash("sha256").update(text).digest("hex"),
    order: 0, originalText: text, schemaVersion: 1, simplifiedVariants: [], title: input.title,
    wordCount: text.split(/\s+/u).filter(Boolean).length });
  return content._id.toString();
}

export async function updateAdminContent(contentId: string, input: { author?: string; assignedUserId?: string | null; category?: string; text?: string; title?: string; visibility?: "private" | "public" }) {
  if (!Types.ObjectId.isValid(contentId)) return null;
  await connectToMongo();
  const current = await ContentModel.findById(contentId).exec();
  if (!current) return null;
  const visibility = input.visibility ?? current.visibility;
  const assignedUserId = input.assignedUserId ?? current.ownerId?.toString();
  if (visibility === "private" && (!assignedUserId || !Types.ObjectId.isValid(assignedUserId))) throw new Error("ASSIGNEE_REQUIRED");
  const ownerId = visibility === "private" ? new Types.ObjectId(assignedUserId) : null;
  current.set({ author: input.author ?? current.author, category: input.category ?? current.category,
    kind: visibility === "public" ? "summary" : "personal", ownerId,
    publishedAt: visibility === "public" ? current.publishedAt ?? new Date() : undefined,
    sourceType: visibility === "public" ? "readcoach_summary" : current.sourceType === "readcoach_summary" ? "admin_text" : current.sourceType,
    title: input.title ?? current.title, visibility });
  await current.save();
  if (input.text?.trim()) {
    const text = input.text.trim();
    await ChapterModel.findOneAndUpdate({ contentId: current._id, order: 0 }, { $set: {
      normalizedTextHash: createHash("sha256").update(text).digest("hex"), originalText: text,
      simplifiedVariants: [], title: current.title, wordCount: text.split(/\s+/u).filter(Boolean).length,
    } }, { upsert: true }).exec();
  }
  return current._id.toString();
}

export async function deleteAdminContent(contentId: string) {
  if (!Types.ObjectId.isValid(contentId)) return false;
  await connectToMongo();
  const id = new Types.ObjectId(contentId);
  const result = await ContentModel.deleteOne({ _id: id }).exec();
  if (!result.deletedCount) return false;
  await Promise.all([ChapterModel.deleteMany({ contentId: id }), ReadingProgressModel.deleteMany({ contentId: id }),
    ReadingSessionModel.deleteMany({ contentId: id }), JobModel.deleteMany({ subjectId: id }), PublicationRequestModel.deleteMany({ contentId: id })]);
  return true;
}
