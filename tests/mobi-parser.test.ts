import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MobiParseError,
  parseMobi,
} from "../src/modules/imports/domain/mobi-parser";

describe("MOBI parser", () => {
  it("extracts metadata and readable chapters from a public-domain MOBI", async () => {
    const bytes = await readFile(path.join(process.cwd(), "tests", "fixtures", "charles-darwin.mobi"));
    const parsed = await parseMobi(bytes);

    expect(parsed.title?.toLowerCase()).toContain("origin of species");
    expect(parsed.author?.toLowerCase()).toContain("darwin");
    expect(parsed.chapters.length).toBeGreaterThan(0);
    expect(parsed.chapters.map((chapter) => chapter.text).join(" ").toLowerCase()).toContain("natural selection");
  });

  it("returns a safe typed error for an invalid MOBI", async () => {
    await expect(parseMobi(new TextEncoder().encode("not a MOBI"))).rejects.toBeInstanceOf(
      MobiParseError,
    );
    await expect(parseMobi(new TextEncoder().encode("not a MOBI"))).rejects.toMatchObject({
      code: "MOBI_INVALID",
    });
  });
});
