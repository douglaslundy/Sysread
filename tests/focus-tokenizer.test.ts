import { describe, expect, it } from "vitest";
import { groupTokens, offsetAtWordIndex, tokenizeText, wordIndexAtOffset } from "../src/modules/focus/domain/tokenizer";

describe("focus tokenizer", () => {
  it("preserves Unicode words, punctuation and UTF-16 source offsets", () => {
    const text = "  Ol\u00e1,  mundo! \ud83d\ude80";
    const tokens = tokenizeText(text);
    expect(tokens.map((token) => token.text)).toEqual(["Ol\u00e1,", "mundo!", "\ud83d\ude80"]);
    expect(text.slice(tokens[0].start, tokens[0].end)).toBe("Ol\u00e1,");
    expect(offsetAtWordIndex(tokens, 1)).toBe(tokens[1].start);
    expect(wordIndexAtOffset(tokens, tokens[2].start)).toBe(2);
  });

  it("groups one, two or three words without losing the source mapping", () => {
    const tokens = tokenizeText("one two three four five");
    expect(groupTokens(tokens, 1)).toHaveLength(5);
    expect(groupTokens(tokens, 2).map((block) => block.text)).toEqual(["one two", "three four", "five"]);
    expect(groupTokens(tokens, 3)[1]).toMatchObject({ text: "four five", wordIndex: 3 });
  });
});
