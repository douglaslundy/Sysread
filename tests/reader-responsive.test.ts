import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("reader responsive layout", () => {
  it("keeps chapters, content and focus available on narrow screens", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width:700px), (hover:none) and (pointer:coarse) {"));
    expect(mobile).toContain(".reader-layout");
    expect(mobile).toContain("display:block");
    expect(mobile).toContain(".reader-chapters,.reader-focus");
    expect(mobile).toContain(".reader-content");
    expect(mobile).toContain("(hover:none) and (pointer:coarse)");
    expect(mobile).toContain("overflow-x:clip");
    expect(mobile).toContain(".reader-mobile-focus-action");
    expect(mobile).toContain("position:sticky");
    expect(css).toContain(".focus-word span,.focus-word strong { width:max-content; white-space:pre; }");
    expect(css).toContain("@keyframes focus-motion-up");
    expect(css).toContain("@keyframes focus-motion-down");
    expect(css).toContain("@keyframes focus-motion-left-to-right");
    expect(css).toContain("@keyframes focus-motion-right-to-left");
  });

  it("only presents the focus action as disabled when it is disabled", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const focusButtonStyles = css.slice(
      css.indexOf(".reader-focus-card button {"),
      css.indexOf(".reader-state"),
    );

    expect(focusButtonStyles).toContain("cursor:pointer");
    expect(focusButtonStyles).toContain("opacity:1");
    expect(focusButtonStyles).toContain(".reader-focus-card button:disabled");
    expect(focusButtonStyles).toContain("cursor:not-allowed; opacity:.45");
  });

  it("keeps the desktop focus panel and its audio controls inside the viewport", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("--reader-focus-width:320px");
    expect(css).toContain("max-height:calc(100vh - 62px)");
    expect(css).toContain("overflow-y:auto");
    expect(css).toContain(".audio-player{display:grid;min-width:0;max-width:100%");
    expect(css).toContain('.audio-player select,.audio-player input[type="url"]{display:block;width:100%;min-width:0;max-width:100%');
  });

  it("contains long book and chapter titles inside the left panel", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(".reader-chapters,.reader-focus { position:relative; min-width:0; max-width:100%");
    expect(css).toContain(".reader-chapters h1 { max-width:100%");
    expect(css).toContain("overflow-wrap:anywhere; word-break:break-word");
    expect(css).toContain(".reader-chapter-title { min-width:0; flex:1 1 auto");
  });
});
