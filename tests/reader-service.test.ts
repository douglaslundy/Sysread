import { describe, expect, it, vi } from "vitest";
import { ReaderError, ReaderService } from "../src/modules/reader/application/reader-service";
import type { ReaderChapter, ReaderContent, ReaderRepository } from "../src/modules/reader/application/types";
import { readableContentQuery } from "../src/modules/reader/infrastructure/reader-repository";

const content: ReaderContent = {
  cleanupLevel: "standard", id: "507f1f77bcf86cd799439011", kind: "personal",
  processingStatus: "ready", sourceType: "upload_pdf", title: "Owned book",
  updatedAt: "2026-08-17T12:00:00.000Z",
};
function repository(overrides: Partial<ReaderRepository> = {}): ReaderRepository {
  return {
    findChapter: vi.fn(async () => null),
    findReadableContent: vi.fn(async () => content),
    listChapters: vi.fn(async () => []),
    ...overrides,
  };
}
describe("reader content authorization", () => {
  it("permits only owned private or published public content", () => {
    const query = readableContentQuery("507f1f77bcf86cd799439011", "507f191e810c19729de860ea");
    expect(query).toMatchObject({
      processingStatus: "ready",
      $or: [{ visibility: "private" }, { visibility: "public" }],
    });
    expect(readableContentQuery("invalid", "invalid")).toBeNull();
  });
  it("passes the authenticated actor to every content access", async () => {
    const repo = repository();
    await new ReaderService(repo).listChapters(content.id, "session-user");
    expect(repo.findReadableContent).toHaveBeenCalledWith(content.id, "session-user");
    expect(repo.listChapters).toHaveBeenCalledWith(content.id);
  });
  it("does not reveal whether inaccessible content exists", async () => {
    const service = new ReaderService(repository({ findReadableContent: vi.fn(async () => null) }));
    await expect(service.getContent(content.id, "another-user")).rejects.toMatchObject({ code: "CONTENT_NOT_FOUND" });
  });
  it("returns original text with its stable version hash", async () => {
    const chapter: ReaderChapter = {
      id: "507f1f77bcf86cd799439012", order: 0, text: "Chapter text",
      textVersionHash: "hash", title: "Chapter 1", variant: "original", wordCount: 2,
    };
    const repo = repository({ findChapter: vi.fn(async () => chapter) });
    const result = await new ReaderService(repo).getChapter({
      actorUserId: "session-user", chapterId: chapter.id, contentId: content.id, variant: "original",
    });
    expect(result).toMatchObject({ text: "Chapter text", textVersionHash: "hash" });
  });
  it("does not silently fall back when simplified text is unavailable", async () => {
    const notReady = "VARIANT_NOT_READY" as const;
    const service = new ReaderService(repository({ findChapter: vi.fn(async () => notReady) }));
    await expect(service.getChapter({
      actorUserId: "session-user", chapterId: "507f1f77bcf86cd799439012",
      contentId: content.id, variant: "simplified",
    })).rejects.toEqual(new ReaderError("VARIANT_NOT_READY"));
  });
});
