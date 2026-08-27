import { describe, expect, it } from "vitest";
import { highlightWords, paragraphAnchor, splitParagraphs, wordIndexForParagraph } from "../src/modules/reader/domain/text-navigation";

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
    expect(paragraphAnchor("Cafe\u0301  text", 0)).toBe(paragraphAnchor("Caf\u00e9 text", 0));
    expect(paragraphAnchor("Same", 0)).not.toBe(paragraphAnchor("Same", 1));
  });

  it("splits a paragraph into segments highlighting the paused word", () => {
    expect(highlightWords("Second paragraph.", 1, 1)).toEqual([
      { highlighted: false, text: "Second " },
      { highlighted: true, text: "paragraph." },
    ]);
  });

  it("highlights several consecutive words for a multi-word block", () => {
    expect(highlightWords("One two three four", 1, 2)).toEqual([
      { highlighted: false, text: "One " },
      { highlighted: true, text: "two three" },
      { highlighted: false, text: " four" },
    ]);
  });

  it("returns the paragraph unhighlighted for an out-of-range word index", () => {
    expect(highlightWords("Short.", 5, 1)).toEqual([{ highlighted: false, text: "Short." }]);
    expect(highlightWords("Short.", -1, 1)).toEqual([{ highlighted: false, text: "Short." }]);
    expect(highlightWords("", 0, 1)).toEqual([{ highlighted: false, text: "" }]);
  });

  it("clamps the highlighted block to the remaining words in the paragraph", () => {
    expect(highlightWords("One two three", 2, 5)).toEqual([
      { highlighted: false, text: "One two " },
      { highlighted: true, text: "three" },
    ]);
  });
});
