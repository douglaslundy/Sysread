import type { ReaderRepository } from "./types";

export type ReadingMode = "continuous" | "focus";

export interface ReadingSessionView {
  averageWpm?: number;
  contentId: string;
  endedAt?: string;
  id: string;
  mode: ReadingMode;
  startedAt: string;
  wordsRead: number;
}

export interface ReadingSessionRepository {
  create(input: { contentId: string; mode: ReadingMode; userId: string; now: Date }): Promise<ReadingSessionView>;
  finish(input: { id: string; userId: string; wordsRead: number; now: Date }): Promise<ReadingSessionView | null>;
}

export class ReadingSessionError extends Error {
  constructor(readonly code: "CONTENT_NOT_FOUND" | "SESSION_NOT_FOUND", message: string) {
    super(message);
  }
}

export class ReadingSessionService {
  constructor(
    private readonly sessions: ReadingSessionRepository,
    private readonly reader: ReaderRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async start(input: { contentId: string; mode: ReadingMode; userId: string }) {
    const content = await this.reader.findReadableContent(input.contentId, input.userId);
    if (!content) throw new ReadingSessionError("CONTENT_NOT_FOUND", "Content not found.");
    return this.sessions.create({ ...input, now: this.clock() });
  }

  async finish(input: { id: string; userId: string; wordsRead: number }) {
    const session = await this.sessions.finish({
      ...input,
      wordsRead: Math.max(0, Math.floor(input.wordsRead)),
      now: this.clock(),
    });
    if (!session) throw new ReadingSessionError("SESSION_NOT_FOUND", "Reading session not found.");
    return session;
  }
}
