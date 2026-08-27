export type ReaderFont = "serif" | "sans" | "mono";
export type ReaderFontSize = "small" | "medium" | "large" | "xlarge";

export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function wordIndexForParagraph(paragraphs: string[], paragraphIndex: number): number {
  return paragraphs.slice(0, Math.max(0, paragraphIndex)).reduce(
    (total, paragraph) => total + (paragraph.match(/\S+/gu)?.length ?? 0),
    0,
  );
}

export function paragraphAnchor(paragraph: string, index: number): string {
  const stablePrefix = paragraph.replace(/\s+/gu, " ").trim().slice(0, 160);
  return "paragraph-" + (index + 1) + "-" + fnv1a(stablePrefix);
}

function tokenize(paragraph: string): RegExpMatchArray[] {
  return Array.from(paragraph.matchAll(/\S+/gu));
}

export function wordIndexAtOffset(paragraph: string, offset: number): number {
  const tokens = tokenize(paragraph);
  if (!tokens.length) return 0;
  const index = tokens.findIndex((token) => offset < (token.index ?? 0) + token[0].length);
  return index === -1 ? tokens.length - 1 : index;
}

export function wordRangeOffsets(paragraph: string, wordIndex: number, wordCount: number): { end: number; start: number } | null {
  const tokens = tokenize(paragraph);
  if (!tokens.length || wordIndex < 0 || wordIndex >= tokens.length) return null;
  const lastIndex = Math.min(tokens.length - 1, wordIndex + Math.max(1, wordCount) - 1);
  const start = tokens[wordIndex].index ?? 0;
  const lastToken = tokens[lastIndex];
  return { end: (lastToken.index ?? 0) + lastToken[0].length, start };
}

export function excerptRange(paragraph: string, excerpt: string): { end: number; start: number } | null {
  const trimmed = excerpt.trim();
  if (!trimmed) return null;
  const start = paragraph.indexOf(trimmed);
  if (start < 0) return null;
  return { end: start + trimmed.length, start };
}

export interface HighlightRange {
  className: string;
  end: number;
  start: number;
  title?: string;
}

export interface RenderSegment {
  className?: string;
  text: string;
  title?: string;
}

export function applyHighlightRanges(paragraph: string, ranges: HighlightRange[]): RenderSegment[] {
  const valid = ranges
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= paragraph.length)
    .sort((left, right) => left.start - right.start);
  const segments: RenderSegment[] = [];
  let cursor = 0;
  for (const range of valid) {
    if (range.start < cursor) continue;
    if (range.start > cursor) segments.push({ text: paragraph.slice(cursor, range.start) });
    segments.push(
      range.title
        ? { className: range.className, text: paragraph.slice(range.start, range.end), title: range.title }
        : { className: range.className, text: paragraph.slice(range.start, range.end) },
    );
    cursor = range.end;
  }
  if (cursor < paragraph.length) segments.push({ text: paragraph.slice(cursor) });
  return segments.length ? segments : [{ text: paragraph }];
}
