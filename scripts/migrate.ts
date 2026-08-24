import mongoose from "mongoose";
import { connectToMongo } from "../src/lib/db/mongodb";
import "../src/lib/db/models";
import { defaultPlatformName } from "../src/config/platform";
import { AppSettingModel } from "../src/modules/admin/infrastructure/app-setting.model";
import { ContentModel } from "../src/modules/catalog/infrastructure/content.model";
import { UserModel } from "../src/modules/users/infrastructure/user.model";
import { ReadingSettingsModel } from "../src/modules/settings/infrastructure/reading-settings.model";

async function main() {
  await connectToMongo();
  await Promise.all([
    UserModel.updateMany({ role: { $exists: false } }, { $set: { role: "user", schemaVersion: 2 } }),
    ContentModel.updateMany({ kind: "summary" }, { $set: { visibility: "public", schemaVersion: 2 } }),
    ContentModel.updateMany({ kind: "personal" }, { $set: { visibility: "private", schemaVersion: 2 } }),
    ReadingSettingsModel.updateMany({ focusPresentation: { $exists: false } }, { $set: { focusPresentation: "orp" } }),
    ReadingSettingsModel.updateMany({ verticalDirection: { $exists: false } }, { $set: { verticalDirection: "up" } }),
    ReadingSettingsModel.updateMany(
      { horizontalDirection: { $exists: false } },
      { $set: { horizontalDirection: "left-to-right", schemaVersion: 3 } },
    ),
    AppSettingModel.updateOne(
      { key: "global" },
      { $set: { schemaVersion: 3 }, $setOnInsert: { platformName: defaultPlatformName } },
      { upsert: true },
    ),
  ]);
  for (const model of Object.values(mongoose.models)) await model.syncIndexes();
  process.stdout.write("database indexes synchronized\n");
}

main().catch((error: unknown) => {
  process.stderr.write("migration failed: " + (error instanceof Error ? error.message : "unknown") + "\n");
  process.exitCode = 1;
}).finally(async () => mongoose.disconnect());
