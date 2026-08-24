import type { ReadingPreferencesUpdate, ReadingSettingsRepository } from "./types";

export class ReadingSettingsService {
  constructor(private readonly repository: ReadingSettingsRepository) {}
  get(userId: string) {
    return this.repository.getOrCreate(userId);
  }
  update(userId: string, update: ReadingPreferencesUpdate) {
    return this.repository.update(userId, update);
  }
}
