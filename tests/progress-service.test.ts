import { describe, expect, it, vi } from "vitest";
import { ProgressError, ProgressService } from "../src/modules/reader/application/progress-service";
import type { ProgressRepository, ReadingCheckpoint } from "../src/modules/reader/application/progress-types";
import type { ReaderRepository } from "../src/modules/reader/application/types";

const checkpoint: ReadingCheckpoint = {
  chapterId: "chapter-1", completed: false, contentId: "content-1",
  paragraphAnchor: "paragraph-1", percent: 20, revision: 2,
  textVariant: "original", textVersionHash: "hash", updatedAt: "2026-08-17T12:00:00.000Z",
  wordIndex: 20,
};

function reader(): ReaderRepository {
  return {
    findReadableContent: vi.fn(async () => ({
      cleanupLevel: "standard" as const, id: "content-1", kind: "personal" as const, processingStatus: "ready" as const,
      sourceType: "upload_pdf" as const, title: "Book", updatedAt: "2026-08-17T12:00:00.000Z",
    })),
    listChapters: vi.fn(async () => []),
    findChapter: vi.fn(async () => ({
      id: "chapter-1", order: 0, text: "text", textVersionHash: "hash",
      title: "Chapter", variant: "original" as const, wordCount: 100,
    })),
  };
}
function progress(result: ReadingCheckpoint | "PROGRESS_CONFLICT" = checkpoint): ProgressRepository {
  return {
    find: vi.fn(async () => checkpoint),
    save: vi.fn(async () => result),
  };
}

describe("reading progress", () => {
  it("authorizes progress reads through the reader boundary", async () => {
    const readerRepository = reader();
    const progressRepository = progress();
    await new ProgressService(readerRepository, progressRepository).get("content-1", "user-1");
    expect(readerRepository.findReadableContent).toHaveBeenCalledWith("content-1", "user-1");
    expect(progressRepository.find).toHaveBeenCalledWith("content-1", "user-1");
  });

  it("derives percentage on the server and keeps the expected revision", async () => {
    const repository = progress();
    await new ProgressService(reader(), repository).save({
      chapterId: "chapter-1", contentId: "content-1", paragraphAnchor: "paragraph-1",
      revision: 1, textVariant: "original", textVersionHash: "hash", userId: "user-1", wordIndex: 25,
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ percent: 25, revision: 1 }));
  });

  it("rejects checkpoints for a different text version", async () => {
    await expect(new ProgressService(reader(), progress()).save({
      chapterId: "chapter-1", contentId: "content-1", revision: 0,
      textVariant: "original", textVersionHash: "stale", userId: "user-1", wordIndex: 0,
    })).rejects.toEqual(new ProgressError("INVALID_CHECKPOINT"));
  });

  it("rejects stale writes from another tab", async () => {
    await expect(new ProgressService(reader(), progress("PROGRESS_CONFLICT")).save({
      chapterId: "chapter-1", contentId: "content-1", revision: 1,
      textVariant: "original", textVersionHash: "hash", userId: "user-1", wordIndex: 20,
    })).rejects.toEqual(new ProgressError("PROGRESS_CONFLICT"));
  });
});
