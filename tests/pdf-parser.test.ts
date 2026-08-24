import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parsePdf,
  pdfParserInternals,
} from "../src/modules/imports/domain/pdf-parser";

describe("deterministic PDF parser", () => {
  it("extracts metadata and chapters while removing repeated margins", async () => {
    const bytes = await readFile(
      path.join(process.cwd(), "tests/fixtures/sample-with-repeated-margins.pdf"),
    );
    const parsed = await parsePdf(new Uint8Array(bytes));

    expect(parsed).toMatchObject({
      author: "Quality Team",
      pageCount: 3,
      // Historical binary fixture retained to verify metadata parsing compatibility.
      title: "ReadCoach Fixture",
    });
    expect(parsed.chapters.map((chapter) => chapter.title)).toEqual([
      "CHAPTER 1 INTRODUCTION",
      "CHAPTER 2 PRACTICE",
      "CHAPTER 3 REFLECTION",
    ]);
    const text = parsed.chapters.map((chapter) => chapter.text).join(" ");
    expect(text).toContain("deliberate practice");
    expect(text).not.toContain("READCOACH TEST FIXTURE");
    expect(text).not.toContain("Internal test copy");
  });

  it("keeps a stable fallback chapter when no heading exists", () => {
    expect(pdfParserInternals.buildChapters(["First paragraph", "Second paragraph"])).toEqual([
      { text: "First paragraph\n\nSecond paragraph", title: "Conte\u00fado" },
    ]);
  });
});
