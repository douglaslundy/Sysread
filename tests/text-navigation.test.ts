import { describe, expect, it } from "vitest";
import {
  applyHighlightRanges,
  excerptRange,
  paragraphAnchor,
  splitParagraphs,
  wordIndexAtOffset,
  wordIndexForParagraph,
  wordRangeOffsets,
} from "../src/modules/reader/domain/text-navigation";

describe("reader text navigation", () => {
  it("splits normalized non-empty paragraphs deterministically", () => {
    expect(splitParagraphs(" First.\r\n\r\n  Second. \n\n\nThird. ")).toEqual([
      "First.",
      "Second.",
      "Third.",
    ]);
  });

  it("maps paragraph starts to deterministic word indexes", () => {
    expect(wordIndexForParagraph(["one two", "three four five"], 1)).toBe(2);
    expect(wordIndexForParagraph(["one two", "three four five"], 2)).toBe(5);
  });

  it("creates stable anchors that distinguish equal paragraphs by position", () => {
    expect(paragraphAnchor("Café  text", 0)).toBe(paragraphAnchor("Café text", 0));
    expect(paragraphAnchor("Same", 0)).not.toBe(paragraphAnchor("Same", 1));
  });

  it("maps a character offset to its containing word", () => {
    expect(wordIndexAtOffset("Second paragraph.", 0)).toBe(0);
    expect(wordIndexAtOffset("Second paragraph.", 3)).toBe(0);
    expect(wordIndexAtOffset("Second paragraph.", 7)).toBe(1);
  });

  it("falls back to the last word for an offset past the end of the text", () => {
    expect(wordIndexAtOffset("Second paragraph.", 999)).toBe(1);
  });

  it("treats an empty paragraph as word zero", () => {
    expect(wordIndexAtOffset("", 0)).toBe(0);
  });

  it("locates the character range for a word block", () => {
    expect(wordRangeOffsets("Second paragraph.", 1, 1)).toEqual({ end: 17, start: 7 });
    expect(wordRangeOffsets("One two three four", 1, 2)).toEqual({ end: 13, start: 4 });
  });

  it("clamps a word range to the remaining words in the paragraph", () => {
    expect(wordRangeOffsets("One two three", 2, 5)).toEqual({ end: 13, start: 8 });
  });

  it("returns null for an out-of-range word index", () => {
    expect(wordRangeOffsets("Short.", 5, 1)).toBeNull();
    expect(wordRangeOffsets("Short.", -1, 1)).toBeNull();
    expect(wordRangeOffsets("", 0, 1)).toBeNull();
  });

  it("locates a saved excerpt inside its paragraph", () => {
    expect(excerptRange("Second paragraph about ideas.", "paragraph about")).toEqual({ end: 22, start: 7 });
  });

  it("trims the excerpt before searching", () => {
    expect(excerptRange("Second paragraph.", "  Second  ")).toEqual({ end: 6, start: 0 });
  });

  it("returns null when the excerpt cannot be found in the paragraph", () => {
    expect(excerptRange("Second paragraph.", "Missing text")).toBeNull();
    expect(excerptRange("Second paragraph.", "   ")).toBeNull();
  });

  it("splits text around one or more highlighted ranges in offset order", () => {
    expect(applyHighlightRanges("One two three four", [
      { className: "b", end: 13, start: 8 },
      { className: "a", end: 3, start: 0 },
    ])).toEqual([
      { className: "a", text: "One" },
      { text: " two " },
      { className: "b", text: "three" },
      { text: " four" },
    ]);
  });

  it("attaches an optional title to a highlighted range", () => {
    expect(applyHighlightRanges("Key idea here.", [{ className: "note", end: 8, start: 4, title: "Key idea" }]))
      .toEqual([{ text: "Key " }, { className: "note", text: "idea", title: "Key idea" }, { text: " here." }]);
  });

  it("drops a range that overlaps an earlier one", () => {
    expect(applyHighlightRanges("One two three", [
      { className: "a", end: 7, start: 0 },
      { className: "b", end: 13, start: 4 },
    ])).toEqual([{ className: "a", text: "One two" }, { text: " three" }]);
  });

  it("returns the plain paragraph when there are no ranges", () => {
    expect(applyHighlightRanges("Plain text.", [])).toEqual([{ text: "Plain text." }]);
  });
});
