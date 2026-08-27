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

export interface HighlightSegment {
  highlighted: boolean;
  text: string;
}

export function highlightWords(paragraph: string, wordIndex: number, wordCount: number): HighlightSegment[] {
  const tokens = Array.from(paragraph.matchAll(/\S+/gu));
  if (!tokens.length || wordIndex < 0 || wordIndex >= tokens.length) {
    return [{ highlighted: false, text: paragraph }];
  }
  const lastIndex = Math.min(tokens.length - 1, wordIndex + Math.max(1, wordCount) - 1);
  const start = tokens[wordIndex].index ?? 0;
  const lastToken = tokens[lastIndex];
  const end = (lastToken.index ?? 0) + lastToken[0].length;
  const segments: HighlightSegment[] = [];
  if (start > 0) segments.push({ highlighted: false, text: paragraph.slice(0, start) });
  segments.push({ highlighted: true, text: paragraph.slice(start, end) });
  if (end < paragraph.length) segments.push({ highlighted: false, text: paragraph.slice(end) });
  return segments;
}
