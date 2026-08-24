import path from "node:path";
import { load } from "cheerio";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

export interface ParsedEpub {
  author?: string;
  chapters: Array<{ text: string; title: string }>;
  cover?: { bytes: Uint8Array; extension: "jpg" | "png" | "webp"; mimeType: string };
  title?: string;
}

export class EpubParseError extends Error {
  constructor(
    readonly code: "EPUB_INVALID" | "EPUB_TOO_COMPLEX" | "EPUB_EMPTY",
    message: string,
  ) {
    super(message);
  }
}

interface OpfPackage {
  manifest?: { item?: Record<string, string> | Array<Record<string, string>> };
  metadata?: {
    creator?: unknown;
    meta?: Record<string, string> | Array<Record<string, string>>;
    title?: unknown;
  };
  spine?: { itemref?: Record<string, string> | Array<Record<string, string>> };
}
const decoder = new TextDecoder("utf-8", { fatal: false });
const xml = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
const array = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

function safeArchivePath(base: string, target: string): string {
  const normalized = path.posix.normalize(path.posix.join(base, target.split("#")[0]));
  if (normalized.startsWith("../") || normalized.startsWith("/") || normalized.includes("\0")) {
    throw new EpubParseError("EPUB_INVALID", "The EPUB contains an unsafe path.");
  }
  return normalized;
}

function unpack(bytes: Uint8Array): Record<string, Uint8Array> {
  let count = 0;
  let total = 0;
  try {
    return unzipSync(bytes, {
      filter(file) {
        count += 1;
        total += file.originalSize;
        if (
          count > 5_000 ||
          file.originalSize > 20 * 1024 * 1024 ||
          total > 100 * 1024 * 1024 ||
          (file.size > 0 && file.originalSize / file.size > 1_000) ||
          file.name.startsWith("/") ||
          path.posix.normalize(file.name).startsWith("../")
        ) {
          throw new EpubParseError("EPUB_TOO_COMPLEX", "The EPUB exceeds safe extraction limits.");
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof EpubParseError) throw error;
    throw new EpubParseError("EPUB_INVALID", "The EPUB archive is invalid.");
  }
}

function cleanXhtml(source: string) {
  const $ = load(source, { xml: { xmlMode: true } });
  $("script,style,nav,svg").remove();
  const title = $("h1,h2,h3,title").first().text().replace(/\s+/gu, " ").trim();
  $("h1,h2,h3,title").remove();
  const blocks: string[] = [];
  $("p,li,blockquote,pre,h1,h2,h3,h4").each((_, element) => {
    const text = $(element).text().replace(/\s+/gu, " ").trim();
    if (text) blocks.push(text);
  });
  if (blocks.length === 0) {
    const text = $("body").text().replace(/\s+/gu, " ").trim();
    if (text) blocks.push(text);
  }
  return { text: blocks.join("\n\n"), title };
}

function validCover(bytes: Uint8Array, mediaType: string) {
  if (mediaType === "image/png" && bytes[0] === 0x89 && decoder.decode(bytes.slice(1, 4)) === "PNG") {
    return { bytes, extension: "png" as const, mimeType: mediaType };
  }
  if (mediaType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { bytes, extension: "jpg" as const, mimeType: mediaType };
  }
  if (mediaType === "image/webp" && decoder.decode(bytes.slice(0, 4)) === "RIFF" && decoder.decode(bytes.slice(8, 12)) === "WEBP") {
    return { bytes, extension: "webp" as const, mimeType: mediaType };
  }
  return undefined;
}

export function parseEpub(bytes: Uint8Array): ParsedEpub {
  const files = unpack(bytes);
  if (decoder.decode(files.mimetype).trim() !== "application/epub+zip") {
    throw new EpubParseError("EPUB_INVALID", "The EPUB mimetype is invalid.");
  }
  const container = files["META-INF/container.xml"];
  if (!container) throw new EpubParseError("EPUB_INVALID", "The EPUB container is missing.");

  let rootFile: string;
  try {
    const parsed = xml.parse(decoder.decode(container));
    const root = array(parsed?.container?.rootfiles?.rootfile)[0];
    rootFile = root?.["@_full-path"];
    if (typeof rootFile !== "string") throw new Error("missing rootfile");
  } catch {
    throw new EpubParseError("EPUB_INVALID", "The EPUB package location is invalid.");
  }
  const packageBytes = files[rootFile];
  if (!packageBytes) throw new EpubParseError("EPUB_INVALID", "The EPUB package is missing.");
  const packageDirectory = path.posix.dirname(rootFile) === "." ? "" : path.posix.dirname(rootFile);

  let opf: OpfPackage;
  try {
    const parsedPackage = xml.parse(decoder.decode(packageBytes)) as {
      package?: OpfPackage;
    };
    if (!parsedPackage.package) throw new Error("missing package");
    opf = parsedPackage.package;
  } catch {
    throw new EpubParseError("EPUB_INVALID", "The EPUB package metadata is invalid.");
  }
  const items = array<Record<string, string>>(opf?.manifest?.item);
  const byId = new Map(items.map((item) => [item["@_id"], item]));
  const labels = new Map<string, string>();
  const navItem = items.find((item) => (item["@_properties"] ?? "").split(/\s+/u).includes("nav"));
  if (navItem) {
    const navPath = safeArchivePath(packageDirectory, navItem["@_href"]);
    const navBytes = files[navPath];
    if (navBytes) {
      const $ = load(decoder.decode(navBytes), { xml: { xmlMode: true } });
      $("nav").first().find("a").each((_, link) => {
        const href = $(link).attr("href");
        const text = $(link).text().replace(/\s+/gu, " ").trim();
        if (href && text) labels.set(safeArchivePath(path.posix.dirname(navPath), href), text);
      });
    }
  }

  const chapters = array<Record<string, string>>(opf?.spine?.itemref)
    .map((reference, index) => {
      const item = byId.get(reference["@_idref"]);
      if (!item) return null;
      const itemPath = safeArchivePath(packageDirectory, item["@_href"]);
      const source = files[itemPath];
      if (!source) return null;
      const cleaned = cleanXhtml(decoder.decode(source));
      if (!cleaned.text) return null;
      return {
        text: cleaned.text,
        title: (labels.get(itemPath) || cleaned.title || `Chapter ${index + 1}`).slice(0, 500),
      };
    })
    .filter((chapter): chapter is { text: string; title: string } => chapter !== null);
  if (chapters.length === 0) {
    throw new EpubParseError("EPUB_EMPTY", "No readable chapters were found in the EPUB.");
  }

  const metadata = opf?.metadata ?? {};
  const coverId = array<Record<string, string>>(metadata?.meta).find(
    (item) => item["@_name"] === "cover",
  )?.["@_content"];
  const coverItem = items.find(
    (item) => (item["@_properties"] ?? "").split(/\s+/u).includes("cover-image"),
  ) ?? (coverId ? byId.get(coverId) : undefined);
  let cover: ParsedEpub["cover"];
  if (coverItem) {
    const coverPath = safeArchivePath(packageDirectory, coverItem["@_href"]);
    const coverBytes = files[coverPath];
    if (coverBytes) cover = validCover(coverBytes, coverItem["@_media-type"]);
  }

  const scalar = (value: unknown) => {
    if (typeof value === "string") return value.trim() || undefined;
    if (value && typeof value === "object" && "#text" in value) {
      const text = String((value as { "#text": unknown })["#text"]).trim();
      return text || undefined;
    }
    return undefined;
  };
  return {
    author: scalar(array(metadata.creator)[0]),
    chapters,
    cover,
    title: scalar(array(metadata.title)[0]),
  };
}

export const epubParserInternals = { cleanXhtml, safeArchivePath };