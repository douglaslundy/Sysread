import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const parserMocks = vi.hoisted(() => ({
  initKf8File: vi.fn(),
  initMobiFile: vi.fn(),
}));

vi.mock("@lingo-reader/mobi-parser", () => parserMocks);

import { parseMobi } from "../src/modules/imports/domain/mobi-parser";

describe("MOBI KF8 fallback", () => {
  it("falls back from an empty classic spine, extracts KF8 text and preserves its cover", async () => {
    const classic = {
      destroy: vi.fn(),
      getSpine: () => [],
      getToc: () => [],
    };
    const kf8 = {
      destroy: vi.fn(),
      getCoverImage: () => path.resolve("public", "icons", "icon-192.png"),
      getMetadata: () => ({ author: ["Author"], title: "KF8 Book" }),
      getSpine: () => [{ id: "0" }],
      getToc: () => [{ href: "chapter-0", label: "Opening" }],
      loadChapter: () => ({ css: [], html: "<body><p>Readable KF8 content.</p></body>" }),
      resolveHref: () => ({ id: "0", selector: "" }),
    };
    parserMocks.initMobiFile.mockResolvedValueOnce(classic);
    parserMocks.initKf8File.mockResolvedValueOnce(kf8);

    const parsed = await parseMobi(new Uint8Array(80));

    expect(parserMocks.initMobiFile).toHaveBeenCalledOnce();
    expect(parserMocks.initKf8File).toHaveBeenCalledOnce();
    expect(parsed).toMatchObject({
      author: "Author",
      chapters: [{ text: "Readable KF8 content.", title: "Opening" }],
      title: "KF8 Book",
    });
    expect(parsed.cover?.mimeType).toBe("image/png");
    expect(parsed.cover?.bytes.length).toBeGreaterThan(0);
  });
});
