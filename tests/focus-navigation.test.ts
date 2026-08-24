import { describe, expect, it } from "vitest";
import { nextFocusAdvance } from "../src/modules/focus/domain/focus-navigation";

describe("focus reading progression", () => {
  it("stops after one paragraph in paragraph mode", () => {
    expect(nextFocusAdvance({ chapterCount: 2, chapterIndex: 0, continuous: false, paragraphCount: 3, paragraphIndex: 0 })).toEqual({ type: "stop" });
  });

  it("advances paragraphs, chapters and completes continuous reading", () => {
    expect(nextFocusAdvance({ chapterCount: 2, chapterIndex: 0, continuous: true, paragraphCount: 3, paragraphIndex: 0 })).toEqual({ paragraphIndex: 1, type: "paragraph" });
    expect(nextFocusAdvance({ chapterCount: 2, chapterIndex: 0, continuous: true, paragraphCount: 3, paragraphIndex: 2 })).toEqual({ chapterIndex: 1, type: "chapter" });
    expect(nextFocusAdvance({ chapterCount: 2, chapterIndex: 1, continuous: true, paragraphCount: 1, paragraphIndex: 0 })).toEqual({ type: "complete" });
  });
});
