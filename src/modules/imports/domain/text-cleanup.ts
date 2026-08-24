export type CleanupLevel = "disabled" | "light" | "standard";

function lightCleanup(source: string): string {
  return source
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "")
    .replace(/([\p{L}])-[ \t]*\n[ \t]*([\p{Ll}])/gu, "$1$2")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/gu, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function standardCleanup(source: string): string {
  const light = lightCleanup(source);
  const paragraphs = light.split(/\n{2,}/u);
  const cleaned = paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const unique: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^(?:p[a\u00e1]gina\s+)?\d{1,4}$/iu.test(trimmed)) continue;
        if (trimmed && unique.at(-1)?.toLocaleLowerCase("pt-BR") === trimmed.toLocaleLowerCase("pt-BR")) continue;
        if (trimmed) unique.push(trimmed);
      }
      return unique.join(" ").replace(/\s+/gu, " ").trim();
    })
    .filter(Boolean);
  return cleaned.join("\n\n");
}

export function cleanupText(source: string, level: CleanupLevel): string {
  if (level === "disabled") return source;
  if (level === "light") return lightCleanup(source);
  return standardCleanup(source);
}

export function cleanupPreview(source: string, level: CleanupLevel, limit = 3000) {
  const cleaned = cleanupText(source, level);
  return {
    after: cleaned.slice(0, limit),
    before: source.slice(0, limit),
    changed: cleaned !== source,
    outputCharacters: cleaned.length,
    sourceCharacters: source.length,
    truncated: source.length > limit || cleaned.length > limit,
  };
}