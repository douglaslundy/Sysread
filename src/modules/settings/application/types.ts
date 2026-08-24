export interface ReadingPreferences {
  autoAdvance: boolean;
  boostMode: boolean;
  focusPresentation: "orp" | "vertical" | "horizontal";
  fontFamily: "serif" | "sans" | "mono";
  fontSize: "small" | "medium" | "large" | "extra-large";
  horizontalDirection: "left-to-right" | "right-to-left";
  wordsPerBlock: 1 | 2 | 3;
  wpm: number;
  verticalDirection: "up" | "down";
}
export type ReadingPreferencesUpdate = Partial<ReadingPreferences>;
export interface ReadingSettingsRepository {
  getOrCreate(userId: string): Promise<ReadingPreferences>;
  update(userId: string, update: ReadingPreferencesUpdate): Promise<ReadingPreferences>;
}
