import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import {
  EpubParseError,
  epubParserInternals,
  parseEpub,
} from "../src/modules/imports/domain/epub-parser";

describe("safe EPUB parser", () => {
  it("follows spine order, uses TOC labels, metadata and an image cover", async () => {
    const bytes = await readFile(
      path.join(process.cwd(), "tests/fixtures/sample-with-toc.epub"),
    );
    const parsed = parseEpub(new Uint8Array(bytes));

    expect(parsed).toMatchObject({ author: "Quality Team", title: "Fixture EPUB" });
    expect(parsed.chapters).toEqual([
      { text: "The first chapter has useful content.", title: "Start Here" },
      {
        text: "The second chapter follows the declared spine order.",
        title: "Deep Practice",
      },
    ]);
    expect(parsed.cover).toMatchObject({ extension: "png", mimeType: "image/png" });
    expect(parsed.cover?.bytes.length).toBeGreaterThan(20);
  });

  it("rejects unsafe archive paths and invalid mimetype", () => {
    expect(() => epubParserInternals.safeArchivePath("OEBPS", "../../secret")).toThrow(
      EpubParseError,
    );
    const invalid = zipSync({ mimetype: new TextEncoder().encode("application/zip") });
    expect(() => parseEpub(invalid)).toThrowError(
      expect.objectContaining({ code: "EPUB_INVALID" }),
    );
  });
});