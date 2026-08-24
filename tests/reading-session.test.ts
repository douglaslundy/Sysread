import { describe, expect, it } from "vitest";
import {
  ReadingSessionError,
  ReadingSessionService,
  type ReadingSessionRepository,
  type ReadingSessionView,
} from "../src/modules/reader/application/reading-session-service";
import type { ReaderRepository } from "../src/modules/reader/application/types";

const session: ReadingSessionView = {
  contentId: "content-1",
  id: "session-1",
  mode: "continuous",
  startedAt: "2026-08-17T10:00:00.000Z",
  wordsRead: 0,
};

describe("reading sessions", () => {
  it("authorizes content before starting and normalizes completed words", async () => {
    let stored = session;
    const sessions: ReadingSessionRepository = {
      create: async () => stored,
      finish: async (input) => {
        stored = { ...stored, endedAt: input.now.toISOString(), wordsRead: input.wordsRead };
        return stored;
      },
    };
    const reader = {
      findReadableContent: async () => ({
        cleanupLevel: "standard" as const, id: "content-1", kind: "personal" as const,
        processingStatus: "ready" as const, sourceType: "upload_pdf" as const,
        title: "Book", updatedAt: "2026-08-17T10:00:00.000Z",
      }),
      findChapter: async () => null,
      listChapters: async () => [],
    } satisfies ReaderRepository;
    const service = new ReadingSessionService(sessions, reader, () => new Date("2026-08-17T10:05:00.000Z"));
    await expect(service.start({ contentId: "content-1", mode: "continuous", userId: "user-1" })).resolves.toEqual(session);
    await expect(service.finish({ id: "session-1", userId: "user-1", wordsRead: 125.9 })).resolves.toMatchObject({ wordsRead: 125 });
  });

  it("does not create a session for unreadable content", async () => {
    const sessions = { create: async () => session, finish: async () => null } satisfies ReadingSessionRepository;
    const reader = {
      findReadableContent: async () => null,
      findChapter: async () => null,
      listChapters: async () => [],
    } satisfies ReaderRepository;
    await expect(new ReadingSessionService(sessions, reader).start({
      contentId: "private", mode: "focus", userId: "other",
    })).rejects.toBeInstanceOf(ReadingSessionError);
  });
});
