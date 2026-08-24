import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { SubscriptionModel } from "@/modules/billing/infrastructure/subscription.model";
import { ChapterModel } from "@/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { SummaryRequestModel } from "@/modules/catalog/infrastructure/summary-request.model";


import { ReadingProgressModel } from "@/modules/reader/infrastructure/reading-progress.model";
import { ReadingSessionModel } from "@/modules/reader/infrastructure/reading-session.model";
import { ReadingSettingsModel } from "@/modules/settings/infrastructure/reading-settings.model";
import { UserModel } from "@/modules/users/infrastructure/user.model";

export async function exportUserData(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return null;
  await connectToMongo();
  const id = new Types.ObjectId(userId);
  const account = await UserModel.findById(id).lean().exec();
  if (!account) return null;
  const contents = await ContentModel.find({ ownerId: id }).lean().exec();
  const contentIds = contents.map((content) => content._id);
  const [chapters, progress, readingSessions, readingSettings, requests, subscription] = await Promise.all([
    ChapterModel.find({ contentId: { $in: contentIds } }).sort({ contentId: 1, order: 1 }).lean().exec(),
    ReadingProgressModel.find({ userId: id }).lean().exec(),
    ReadingSessionModel.find({ userId: id }).lean().exec(),
    ReadingSettingsModel.findOne({ userId: id }).lean().exec(),
    SummaryRequestModel.find({ userId: id }).lean().exec(),
    SubscriptionModel.findOne({ userId: id }).lean().exec(),
  ]);
  const { passwordHash: _passwordHash, ...safeAccount } = account as typeof account & { passwordHash?: string };
  void _passwordHash;
  return {
    account: safeAccount,
    chapters,
    contents,
    exportedAt: new Date().toISOString(),
    progress,
    readingSessions,
    readingSettings,
    schemaVersion: 1,
    subscription,
    summaryRequests: requests,
  };
}
