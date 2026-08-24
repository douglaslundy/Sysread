import { describe, expect, it, vi } from "vitest";
import { ReadingSettingsService } from "../src/modules/settings/application/reading-settings-service";
import type { ReadingPreferences, ReadingSettingsRepository } from "../src/modules/settings/application/types";

describe("reading settings", () => {
  it("uses the authenticated user id for global settings", async () => {
    const defaults: ReadingPreferences = {
      autoAdvance: false, boostMode: false, focusPresentation: "orp", fontFamily: "serif",
      fontSize: "large", horizontalDirection: "left-to-right", verticalDirection: "up", wordsPerBlock: 1, wpm: 350,
    };
    const repository: ReadingSettingsRepository = {
      getOrCreate: vi.fn(async () => defaults),
      update: vi.fn(async (_userId, update) => ({ ...defaults, ...update })),
    };
    const service = new ReadingSettingsService(repository);
    await service.update("session-user", { wpm: 500 });
    expect(repository.update).toHaveBeenCalledWith("session-user", { wpm: 500 });
  });
});
