import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  initMobiFile,
  type Mobi,
  type MobiTocItem,
} from "@lingo-reader/mobi-parser";
import { epubParserInternals } from "./epub-parser";

export interface ParsedMobi {
  author?: string;
  chapters: Array<{ text: string; title: string }>;
  title?: string;
}

export class MobiParseError extends Error {
  constructor(
    readonly code: "MOBI_INVALID" | "MOBI_TOO_COMPLEX" | "MOBI_EMPTY",
    message: string,
  ) {
    super(message);
  }
}

const MAX_CHAPTERS = 5_000;
const MAX_CHAPTER_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

function collectTocLabels(book: Mobi) {
  const labels = new Map<string, string>();
  const visit = (items: MobiTocItem[]) => {
    for (const item of items) {
      const label = item.label.replace(/\s+/gu, " ").trim();
      const resolved = book.resolveHref(item.href);
      if (label && resolved?.id && !labels.has(resolved.id)) {
        labels.set(resolved.id, label);
      }
      if (item.children) visit(item.children);
    }
  };
  visit(book.getToc());
  return labels;
}

export async function parseMobi(bytes: Uint8Array): Promise<ParsedMobi> {
  const resourceDirectory = await mkdtemp(path.join(tmpdir(), "sysread-mobi-"));
  let book: Mobi | undefined;
  try {
    book = await initMobiFile(bytes, resourceDirectory);
    const spine = book.getSpine();
    if (spine.length > MAX_CHAPTERS) {
      throw new MobiParseError("MOBI_TOO_COMPLEX", "The MOBI has too many chapters.");
    }

    const labels = collectTocLabels(book);
    let totalBytes = 0;
    const chapters = spine.flatMap((chapter, index) => {
      const chapterBytes = Buffer.byteLength(chapter.text, "utf8");
      totalBytes += chapterBytes;
      if (chapterBytes > MAX_CHAPTER_BYTES || totalBytes > MAX_TOTAL_BYTES) {
        throw new MobiParseError(
          "MOBI_TOO_COMPLEX",
          "The MOBI exceeds safe extraction limits.",
        );
      }
      const cleaned = epubParserInternals.cleanXhtml(chapter.text);
      if (!cleaned.text) return [];
      return [{
        text: cleaned.text,
        title: (labels.get(chapter.id) || cleaned.title || `Chapter ${index + 1}`).slice(0, 500),
      }];
    });
    if (chapters.length === 0) {
      throw new MobiParseError("MOBI_EMPTY", "No readable chapters were found in the MOBI.");
    }

    const metadata = book.getMetadata();
    const title = metadata.title?.trim() || undefined;
    const author = metadata.author.map((value) => value.trim()).filter(Boolean).join(", ") || undefined;
    return { author, chapters, title };
  } catch (error) {
    if (error instanceof MobiParseError) throw error;
    throw new MobiParseError("MOBI_INVALID", "The MOBI file is invalid.");
  } finally {
    book?.destroy();
    await rm(resourceDirectory, { force: true, recursive: true }).catch(() => undefined);
  }
}
