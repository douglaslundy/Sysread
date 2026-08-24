import type { ReaderChapter, ReaderChapterSummary, ReaderContent, ReaderRepository, TextVariant } from "./types";

export type ReaderErrorCode = "CONTENT_NOT_FOUND" | "CHAPTER_NOT_FOUND" | "VARIANT_NOT_READY";
export class ReaderError extends Error {
  constructor(readonly code: ReaderErrorCode) {
    super(code === "VARIANT_NOT_READY" ? "The requested text version is not ready." : code === "CHAPTER_NOT_FOUND" ? "Chapter not found." : "Content not found.");
  }
}
export class ReaderService {
  constructor(private readonly repository: ReaderRepository) {}
  async getContent(contentId: string, actorUserId: string): Promise<ReaderContent> {
    const content = await this.repository.findReadableContent(contentId, actorUserId);
    if (!content) throw new ReaderError("CONTENT_NOT_FOUND");
    return content;
  }
  async listChapters(contentId: string, actorUserId: string): Promise<ReaderChapterSummary[]> {
    await this.getContent(contentId, actorUserId);
    return this.repository.listChapters(contentId);
  }
  async getChapter(input: { actorUserId: string; chapterId: string; contentId: string; variant: TextVariant }): Promise<ReaderChapter> {
    await this.getContent(input.contentId, input.actorUserId);
    const chapter = await this.repository.findChapter(input.contentId, input.chapterId, input.variant);
    if (chapter === "VARIANT_NOT_READY") throw new ReaderError("VARIANT_NOT_READY");
    if (!chapter) throw new ReaderError("CHAPTER_NOT_FOUND");
    return chapter;
  }
}
