import type { ServerEnv } from "@/lib/env";
import { logEvent } from "@/lib/observability";
import { SubscriptionModel } from "@/modules/billing/infrastructure/subscription.model";
import { ChapterModel } from "@/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { SummaryRequestModel } from "@/modules/catalog/infrastructure/summary-request.model";
import { UploadQuotaModel } from "@/modules/imports/infrastructure/upload-quota.model";
import { createPrivateObjectStorage } from "@/modules/imports/infrastructure/private-storage-factory";
import { JobModel } from "@/modules/jobs/infrastructure/job.model";
import { ReadingProgressModel } from "@/modules/reader/infrastructure/reading-progress.model";
import { ReadingSessionModel } from "@/modules/reader/infrastructure/reading-session.model";
import { ReadingSettingsModel } from "@/modules/settings/infrastructure/reading-settings.model";
import { UserModel } from "@/modules/users/infrastructure/user.model";
import { connectToMongo } from "@/lib/db/mongodb";

export async function purgeDeletedUsers(env: ServerEnv, limit = 25): Promise<number> {
  await connectToMongo();
  const storage = createPrivateObjectStorage(env);
  const users = await UserModel.find({ lifecycleStatus: "deleting" }).limit(limit).exec();

  for (const user of users) {
    const contents = await ContentModel.find({ ownerId: user._id }).exec();
    const contentIds = contents.map((content) => content._id);

    for (const content of contents) {
      const keys = [
        content.sourceMetadata.storageKey,
        content.sourceMetadata.coverStorageKey,
      ];
      for (const key of keys) {
        if (typeof key === "string") await storage.delete(key);
      }
    }

    await Promise.all([
      ChapterModel.deleteMany({ contentId: { $in: contentIds } }).exec(),
      ReadingProgressModel.deleteMany({ userId: user._id }).exec(),
      ReadingSessionModel.deleteMany({ userId: user._id }).exec(),
      ReadingSettingsModel.deleteMany({ userId: user._id }).exec(),
      SummaryRequestModel.deleteMany({ userId: user._id }).exec(),
      SubscriptionModel.deleteMany({ userId: user._id }).exec(),
      UploadQuotaModel.deleteMany({ ownerId: user._id }).exec(),
      JobModel.deleteMany({ ownerId: user._id }).exec(),
    ]);
    await ContentModel.deleteMany({ ownerId: user._id }).exec();
    await UserModel.updateOne(
      { _id: user._id, lifecycleStatus: "deleting" },
      {
        $inc: { authVersion: 1 },
        $set: {
          emailNormalized: "deleted+" + user._id.toString() + "@invalid.local",
          lifecycleStatus: "deleted",
          name: "Deleted user",
        },
        $unset: { avatarUrl: 1, passwordHash: 1 },
      },
    ).exec();
    logEvent({
      event: "privacy_user_purged",
      fields: { userId: user._id.toString() },
    });
  }

  logEvent({ event: "privacy_purge_batch", fields: { count: users.length } });
  return users.length;
}