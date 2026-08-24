import { describe, expect, it } from "vitest";
import { paragraphAnchor, splitParagraphs, wordIndexForParagraph } from "../src/modules/reader/domain/text-navigation";

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
});
