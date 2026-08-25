import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";

const modelMocks = vi.hoisted(() => ({
  chapterDelete: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(undefined) })),
  contentDelete: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(undefined) })),
  quotaUpdate: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock("../src/modules/catalog/infrastructure/chapter.model", () => ({
  ChapterModel: { deleteMany: modelMocks.chapterDelete },
}));
vi.mock("../src/modules/catalog/infrastructure/content.model", () => ({
  ContentModel: { deleteOne: modelMocks.contentDelete },
}));
vi.mock("../src/modules/imports/infrastructure/upload-quota.model", () => ({
  UploadQuotaModel: { updateOne: modelMocks.quotaUpdate },
}));

import { discardRejectedUpload } from "../src/modules/imports/infrastructure/rejected-upload-cleanup";

describe("rejected upload cleanup", () => {
  it("removes private files, content records and reserved quota", async () => {
    const ownerId = new Types.ObjectId();
    const contentId = new Types.ObjectId();
    const storage = {
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      put: vi.fn(),
    };

    await discardRejectedUpload({
      contentId,
      ownerId,
      sourceMetadata: {
        byteSize: 4_096,
        coverStorageKey: `${ownerId}/${contentId}.cover.jpg`,
        storageKey: `${ownerId}/${crypto.randomUUID()}.mobi`,
      },
      storage,
    });

    expect(storage.delete).toHaveBeenCalledTimes(2);
    expect(modelMocks.chapterDelete).toHaveBeenCalledWith({ contentId });
    expect(modelMocks.contentDelete).toHaveBeenCalledWith({ _id: contentId, ownerId });
    expect(modelMocks.quotaUpdate).toHaveBeenCalledWith(
      { ownerId, usedBytes: { $gte: 4_096 } },
      { $inc: { usedBytes: -4_096 } },
    );
  });
});
