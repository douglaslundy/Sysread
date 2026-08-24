import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import type { ReadingPreferences, ReadingPreferencesUpdate, ReadingSettingsRepository } from "../application/types";
import { ReadingSettingsModel, type ReadingSettings } from "./reading-settings.model";

const defaults: ReadingPreferences = {
  autoAdvance: false,
  boostMode: false,
  focusPresentation: "orp",
  fontFamily: "serif",
  fontSize: "large",
  horizontalDirection: "left-to-right",
  wordsPerBlock: 1,
  wpm: 350,
  verticalDirection: "up",
};

function map(settings: ReadingSettings): ReadingPreferences {
  return {
    autoAdvance: settings.autoAdvance,
    boostMode: settings.boostMode,
    focusPresentation: settings.focusPresentation ?? defaults.focusPresentation,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    horizontalDirection: settings.horizontalDirection ?? defaults.horizontalDirection,
    wordsPerBlock: settings.wordsPerBlock,
    wpm: settings.wpm,
    verticalDirection: settings.verticalDirection ?? defaults.verticalDirection,
  };
}

export class MongoReadingSettingsRepository implements ReadingSettingsRepository {
  async getOrCreate(userId: string): Promise<ReadingPreferences> {
    if (!Types.ObjectId.isValid(userId)) return defaults;
    await connectToMongo();
    const settings = await ReadingSettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { ...defaults, schemaVersion: 3 } },
      { returnDocument: "after", upsert: true },
    ).exec();
    return map(settings);
  }

  async update(userId: string, update: ReadingPreferencesUpdate): Promise<ReadingPreferences> {
    await connectToMongo();
    const settings = await ReadingSettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: update, $setOnInsert: { schemaVersion: 3 } },
      { returnDocument: "after", runValidators: true, upsert: true },
    ).exec();
    return map(settings);
  }
}
