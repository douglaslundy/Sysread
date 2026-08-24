import { describe, expect, it } from "vitest";
import { blockDurationMs, blockOrp, orpIndex } from "../src/modules/focus/domain/pacing";
import { groupTokens, tokenizeText } from "../src/modules/focus/domain/tokenizer";

describe("focus ORP and pacing", () => {
  it("places the ORP inside the lexical core and preserves the whole block", () => {
    expect(orpIndex("\"reading,\"")).toBeGreaterThan(0);
    const block = groupTokens(tokenizeText("deep reading"), 2)[0];
    const parts = blockOrp(block);
    expect(parts.before + parts.pivot + parts.after).toBe("deep reading");
    expect(parts.before).toBe("deep r");
    expect(parts.pivot).toBe("e");
    expect(parts.after).toBe("ading");
  });

  it("centers two and three words by their combined character count", () => {
    const two = blockOrp(groupTokens(tokenizeText("short extraordinarily"), 2)[0]);
    expect(two.before + two.pivot + two.after).toBe("short extraordinarily");
    expect(two.before).toBe("short extra");
    expect(two.pivot).toBe("");

    const oddTwo = blockOrp(groupTokens(tokenizeText("a bcdefg"), 2)[0]);
    expect(oddTwo.before + oddTwo.pivot + oddTwo.after).toBe("a bcdefg");
    expect(oddTwo.before).toBe("a bc");
    expect(oddTwo.pivot).toBe("d");

    const three = blockOrp(groupTokens(tokenizeText("aa bbb cccc"), 3)[0]);
    expect(three.before + three.pivot + three.after).toBe("aa bbb cccc");
    expect(three.pivot).toBe("b");

    const evenThree = blockOrp(groupTokens(tokenizeText("aa bb cc"), 3)[0]);
    expect(evenThree.before + evenThree.pivot + evenThree.after).toBe("aa bb cc");
    expect(evenThree.pivot).toBe("");
  });

  it("bounds WPM and adds pauses for punctuation and complex words", () => {
    const plain = groupTokens(tokenizeText("read"), 1)[0];
    const sentence = groupTokens(tokenizeText("read."), 1)[0];
    const complex = groupTokens(tokenizeText("interdisciplinary"), 1)[0];
    expect(blockDurationMs(sentence, 350)).toBeGreaterThan(blockDurationMs(plain, 350));
    expect(blockDurationMs(complex, 350)).toBeGreaterThan(blockDurationMs(plain, 350));
    expect(blockDurationMs(plain, 50)).toBe(blockDurationMs(plain, 100));
    expect(blockDurationMs(plain, 5000)).toBe(blockDurationMs(plain, 1000));
  });
});
