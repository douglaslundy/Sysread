import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface ParsedPdf {
  author?: string;
  chapters: Array<{ text: string; title: string }>;
  pageCount: number;
  title?: string;
}

export class PdfParseError extends Error {
  constructor(
    readonly code: "PDF_ENCRYPTED" | "PDF_EMPTY" | "PARSE_FAILED",
    message: string,
  ) {
    super(message);
  }
}

interface PositionedText {
  str: string;
  transform: number[];
}

function pageLines(items: unknown[]): string[] {
  const positioned = items.filter(
    (item): item is PositionedText =>
      typeof item === "object" &&
      item !== null &&
      "str" in item &&
      typeof item.str === "string" &&
      "transform" in item &&
      Array.isArray(item.transform),
  );
  const rows: Array<{ parts: Array<{ text: string; x: number }>; y: number }> = [];

  for (const item of positioned) {
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!row) {
      row = { parts: [], y };
      rows.push(row);
    }
    row.parts.push({ text: item.str, x });
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/gu, " ")
        .trim(),
    )
    .filter(Boolean);
}

function marginKey(line: string): string {
  return line.toLocaleLowerCase("pt-BR").replace(/\d+/gu, "#").replace(/\s+/gu, " ").trim();
}

function removeRepeatedMargins(pages: string[][]): string[][] {
  const counts = new Map<string, Set<number>>();
  pages.forEach((lines, pageIndex) => {
    const candidates = [...lines.slice(0, 2), ...lines.slice(-2)];
    for (const line of new Set(candidates)) {
      const key = marginKey(line);
      const seen = counts.get(key) ?? new Set<number>();
      seen.add(pageIndex);
      counts.set(key, seen);
    }
  });
  const threshold = Math.max(2, Math.ceil(pages.length * 0.6));
  const repeated = new Set(
    [...counts.entries()]
      .filter(([, pageIndexes]) => pageIndexes.size >= threshold)
      .map(([key]) => key),
  );
  return pages.map((lines) => lines.filter((line) => !repeated.has(marginKey(line))));
}

function isHeading(line: string): boolean {
  return /^(chapter|cap[i\u00ed]tulo|parte)\s+[\divxlcdm]+\b/iu.test(line) ||
    (line.length <= 90 && /[A-Z\u00c0-\u00de]/u.test(line) && line === line.toLocaleUpperCase("pt-BR"));
}

function buildChapters(lines: string[]): Array<{ text: string; title: string }> {
  const chapters: Array<{ body: string[]; title: string }> = [];
  let current = { body: [] as string[], title: "Conte\u00fado" };

  for (const line of lines) {
    if (isHeading(line)) {
      if (current.body.length > 0) chapters.push(current);
      current = { body: [], title: line.slice(0, 500) };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length > 0) chapters.push(current);

  return chapters
    .map((chapter) => ({
      text: chapter.body.join("\n\n").replace(/\n{3,}/gu, "\n\n").trim(),
      title: chapter.title,
    }))
    .filter((chapter) => chapter.text.length > 0);
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedPdf> {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true });
  try {
    const document = await task.promise;
    const pages: string[][] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pageLines(content.items));
      page.cleanup();
    }
    const lines = removeRepeatedMargins(pages).flat();
    const chapters = buildChapters(lines);
    if (chapters.length === 0) {
      throw new PdfParseError("PDF_EMPTY", "No readable text was found in the PDF.");
    }
    const metadata = await document.getMetadata().catch(() => null);
    const info = metadata?.info as Record<string, unknown> | undefined;
    return {
      author: typeof info?.Author === "string" ? info.Author.trim() || undefined : undefined,
      chapters,
      pageCount: document.numPages,
      title: typeof info?.Title === "string" ? info.Title.trim() || undefined : undefined,
    };
  } catch (error) {
    if (error instanceof PdfParseError) throw error;
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      throw new PdfParseError("PDF_ENCRYPTED", "Password-protected PDFs are not supported.");
    }
    throw new PdfParseError("PARSE_FAILED", "The PDF could not be parsed.");
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

export const pdfParserInternals = { buildChapters, pageLines, removeRepeatedMargins };