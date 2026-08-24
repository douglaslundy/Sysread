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
