import { ReaderError, ReaderService } from "./reader-service";
import type { ProgressRepository, ReadingCheckpoint } from "./progress-types";
import type { ReaderRepository, TextVariant } from "./types";

export type ProgressErrorCode = "INVALID_CHECKPOINT" | "PROGRESS_CONFLICT";
export class ProgressError extends Error {
  constructor(readonly code: ProgressErrorCode) {
    super(code === "PROGRESS_CONFLICT" ? "Reading progress changed in another tab." : "The reading checkpoint is invalid.");
  }
}

export class ProgressService {
  private readonly reader: ReaderService;

  constructor(
    readerRepository: ReaderRepository,
    private readonly progressRepository: ProgressRepository,
  ) {
    this.reader = new ReaderService(readerRepository);
  }

  async get(contentId: string, userId: string): Promise<ReadingCheckpoint | null> {
    await this.reader.getContent(contentId, userId);
    return this.progressRepository.find(contentId, userId);
  }

  async save(input: {
    chapterId: string;
    completed?: boolean;
    contentId: string;
    paragraphAnchor?: string;
    revision: number;
    textVariant: TextVariant;
    textVersionHash: string;
    userId: string;
    wordIndex: number;
  }): Promise<ReadingCheckpoint> {
    const chapter = await this.reader.getChapter({
      actorUserId: input.userId,
      chapterId: input.chapterId,
      contentId: input.contentId,
      variant: input.textVariant,
    });
    if (
      input.textVersionHash !== chapter.textVersionHash ||
      input.wordIndex > chapter.wordCount
    ) {
      throw new ProgressError("INVALID_CHECKPOINT");
    }
    const completed = input.completed ?? input.wordIndex === chapter.wordCount;
    const percent = completed
      ? 100
      : chapter.wordCount
        ? Math.min(99.99, (input.wordIndex / chapter.wordCount) * 100)
        : 0;
    const saved = await this.progressRepository.save({
      ...input,
      completed,
      percent,
    });
    if (saved === "PROGRESS_CONFLICT") throw new ProgressError(saved);
    return saved;
  }
}

export { ReaderError };
