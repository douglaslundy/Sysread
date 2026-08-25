import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  initKf8File,
  initMobiFile,
  type Kf8,
  type Mobi,
} from "@lingo-reader/mobi-parser";
import { epubParserInternals } from "./epub-parser";

export interface ParsedMobi {
  author?: string;
  chapters: Array<{ text: string; title: string }>;
  cover?: { bytes: Uint8Array; extension: "jpg" | "png" | "webp"; mimeType: string };
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

type MobiBook = Kf8 | Mobi;
type TocItem = { children?: TocItem[]; href: string; label: string };

function collectTocLabels(book: MobiBook) {
  const labels = new Map<string, string>();
  const visit = (items: TocItem[]) => {
    for (const item of items) {
      const label = item.label.replace(/\s+/gu, " ").trim();
      let resolved: { id: string } | undefined;
      try {
        resolved = book.resolveHref(item.href);
      } catch {
        resolved = undefined;
      }
      if (label && resolved?.id && !labels.has(resolved.id)) {
        labels.set(resolved.id, label);
      }
      if (item.children) visit(item.children);
    }
  };
  try {
    visit(book.getToc());
  } catch {
    return labels;
  }
  return labels;
}

async function extractCover(book: MobiBook): Promise<ParsedMobi["cover"]> {
  try {
    const coverPath = book.getCoverImage();
    if (!coverPath) return undefined;
    const bytes = new Uint8Array(await readFile(coverPath));
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { bytes, extension: "jpg", mimeType: "image/jpeg" };
    }
    if (bytes[0] === 0x89 && new TextDecoder("ascii").decode(bytes.slice(1, 4)) === "PNG") {
      return { bytes, extension: "png", mimeType: "image/png" };
    }
    if (
      new TextDecoder("ascii").decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder("ascii").decode(bytes.slice(8, 12)) === "WEBP"
    ) {
      return { bytes, extension: "webp", mimeType: "image/webp" };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function extractBook(book: MobiBook, format: "kf8" | "mobi"): Promise<ParsedMobi> {
  const spine = book.getSpine();
  if (spine.length > MAX_CHAPTERS) {
    throw new MobiParseError("MOBI_TOO_COMPLEX", "The MOBI has too many chapters.");
  }

  const labels = collectTocLabels(book);
  let totalBytes = 0;
  const chapters = spine.flatMap((chapter, index) => {
    let source: string | undefined;
    try {
      source = format === "mobi"
        ? (chapter as { text?: string }).text
        : book.loadChapter(chapter.id)?.html;
    } catch {
      return [];
    }
    if (!source) return [];
    const chapterBytes = Buffer.byteLength(source, "utf8");
    totalBytes += chapterBytes;
    if (chapterBytes > MAX_CHAPTER_BYTES || totalBytes > MAX_TOTAL_BYTES) {
      throw new MobiParseError(
        "MOBI_TOO_COMPLEX",
        "The MOBI exceeds safe extraction limits.",
      );
    }
    try {
      const cleaned = epubParserInternals.cleanXhtml(source);
      if (!cleaned.text) return [];
      return [{
        text: cleaned.text,
        title: (labels.get(chapter.id) || cleaned.title || `Chapter ${index + 1}`).slice(0, 500),
      }];
    } catch {
      return [];
    }
  });
  if (chapters.length === 0) {
    throw new MobiParseError("MOBI_EMPTY", "No readable chapters were found in the MOBI.");
  }

  const metadata = book.getMetadata();
  const title = metadata.title?.trim() || undefined;
  const author = (metadata.author ?? []).map((value) => value.trim()).filter(Boolean).join(", ") || undefined;
  const cover = await extractCover(book);
  return { author, chapters, cover, title };
}

export async function parseMobi(bytes: Uint8Array): Promise<ParsedMobi> {
  const resourceDirectory = await mkdtemp(path.join(tmpdir(), "sysread-mobi-"));
  let book: MobiBook | undefined;
  let classicFailure: unknown;
  try {
    try {
      book = await initMobiFile(bytes, resourceDirectory);
      return await extractBook(book, "mobi");
    } catch (error) {
      if (error instanceof MobiParseError && error.code === "MOBI_TOO_COMPLEX") throw error;
      classicFailure = error;
      book?.destroy();
      book = undefined;
    }
    book = await initKf8File(bytes, resourceDirectory);
    return await extractBook(book, "kf8");
  } catch (error) {
    if (error instanceof MobiParseError && error.code === "MOBI_TOO_COMPLEX") throw error;
    if (
      error instanceof MobiParseError && error.code === "MOBI_EMPTY" &&
      classicFailure instanceof MobiParseError && classicFailure.code === "MOBI_EMPTY"
    ) {
      throw error;
    }
    throw new MobiParseError("MOBI_INVALID", "The MOBI file is invalid.");
  } finally {
    book?.destroy();
    await rm(resourceDirectory, { force: true, recursive: true }).catch(() => undefined);
  }
}
