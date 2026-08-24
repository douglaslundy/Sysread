import { describe, expect, it } from "vitest";
import {
  cleanupPreview,
  cleanupText,
} from "../src/modules/imports/domain/text-cleanup";

describe("reversible text cleanup levels", () => {
  const noisy = [
    "READCOACH SAMPLE",
    "A deliberate prac-",
    "tice improves reading.   ",
    "",
    "42",
    "",
    "Useful ideas remain intact.",
    "Useful ideas remain intact.",
  ].join("\r\n");

  it("preserves source bytes when cleanup is disabled", () => {
    expect(cleanupText(noisy, "disabled")).toBe(noisy);
  });

  it("light cleanup removes control/layout noise without dropping prose", () => {
    const result = cleanupText(`A\u0000 word-\nwrap.\n\n\nNext paragraph.`, "light");
    expect(result).toBe("A wordwrap.\n\nNext paragraph.");
  });

  it("standard cleanup removes page markers and consecutive duplicates", () => {
    const result = cleanupText(noisy, "standard");
    expect(result).toContain("A deliberate practice improves reading.");
    expect(result).toContain("Useful ideas remain intact.");
    expect(result).not.toMatch(/^42$/mu);
    expect(result.match(/Useful ideas remain intact\./gu)).toHaveLength(1);
  });

  it("returns a bounded before/after preview with audit counts", () => {
    const preview = cleanupPreview("word ".repeat(1000), "light", 120);
    expect(preview.before).toHaveLength(120);
    expect(preview.after).toHaveLength(120);
    expect(preview.sourceCharacters).toBe(5000);
    expect(preview.truncated).toBe(true);
  });
});