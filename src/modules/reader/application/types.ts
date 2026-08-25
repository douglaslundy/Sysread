export type TextVariant = "original" | "simplified";

export interface ReaderContent {
  author?: string;
  category?: string;
  cleanupLevel: "disabled" | "light" | "standard";
  coverUrl?: string;
  id: string;
  kind: "personal" | "public" | "summary";
  processingStatus: "ready";
  sourceType: "upload_pdf" | "upload_epub" | "upload_mobi" | "link_article" | "admin_text" | "readcoach_summary";
  title: string;
  updatedAt: string;
}
export interface ReaderChapterSummary { id: string; order: number; title: string; wordCount: number; }
export interface ReaderChapter extends ReaderChapterSummary { text: string; textVersionHash: string; variant: TextVariant; }
export interface ReaderRepository {
  findReadableContent(contentId: string, actorUserId: string): Promise<ReaderContent | null>;
  findChapter(contentId: string, chapterId: string, variant: TextVariant): Promise<ReaderChapter | "VARIANT_NOT_READY" | null>;
  listChapters(contentId: string): Promise<ReaderChapterSummary[]>;
}
