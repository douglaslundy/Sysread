import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ParsedArticle {
  byline?: string;
  canonicalUrl?: string;
  text: string;
  title: string;
}

export function parseReadableArticle(html: string, url: string): ParsedArticle | null {
  const { document } = parseHTML(html);
  const canonicalValue = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? undefined;
  const base = document.createElement("base");
  base.setAttribute("href", url);
  document.head.append(base);
  const result = new Readability(document as unknown as Document, {
    charThreshold: 80,
  }).parse();
  if (!result?.textContent) return null;
  const text = result.textContent.replace(/\r/gu, "").replace(/\n{3,}/gu, "\n\n").trim();
  if (text.length < 80) return null;
  return {
    byline: result.byline?.trim() || undefined,
    canonicalUrl: canonicalValue ? new URL(canonicalValue, url).toString() : undefined,
    text,
    title: result.title?.trim().slice(0, 500) || "Imported article",
  };
}
