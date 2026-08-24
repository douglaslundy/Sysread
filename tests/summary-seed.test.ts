import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  SUMMARY_PROVENANCE,
  summaryCatalog,
} from "../src/modules/catalog/seed/summaries";

describe("summary seed catalog", () => {
  it("uses unique stable identifiers and public-domain provenance", () => {
    const slugs = summaryCatalog.map((entry) => entry.slug);
    const titles = summaryCatalog.map((entry) => entry.title);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(SUMMARY_PROVENANCE).toBe(
      "public_domain_source_original_readcoach_summary",
    );
    expect(summaryCatalog.length).toBeGreaterThanOrEqual(5);
  });

  it("contains concise original chapters and explicit visual palettes", () => {
    for (const entry of summaryCatalog) {
      expect(entry.chapters.length).toBeGreaterThanOrEqual(2);
      expect(entry.palette).toHaveLength(3);
      expect(entry.palette.every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(
        true,
      );

      for (const chapter of entry.chapters) {
        const words = chapter.text.trim().split(/\s+/u);
        expect(words.length).toBeGreaterThan(20);
        expect(words.length).toBeLessThan(120);
      }
    }
  });

  it("generates an owned 800x1200 PNG cover for every summary", async () => {
    for (const entry of summaryCatalog) {
      const coverPath = path.join(
        process.cwd(),
        "public/covers/summaries",
        `${entry.slug}.png`,
      );
      await access(coverPath);
      const bytes = await readFile(coverPath);
      const metadata = await sharp(bytes).metadata();

      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    }
  });
});