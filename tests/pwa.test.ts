import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";

const root = path.resolve(import.meta.dirname, "..");

describe("PWA contract", () => {
  it("declares an installable standalone manifest", async () => {
    const value = await manifest();

    expect(value).toMatchObject({
      display: "standalone",
      lang: "pt-BR",
      scope: "/",
      start_url: "/",
      theme_color: "#000000",
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("generates every required PNG at the declared dimensions", async () => {
    for (const size of [180, 192, 512]) {
      const metadata = await sharp(
        path.join(root, "public", "icons", "icon-" + size + ".png"),
      ).metadata();

      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(size);
      expect(metadata.height).toBe(size);
    }
  });

  it("never caches API routes or the authenticated root navigation", () => {
    const source = readFileSync(path.join(root, "public", "sw.js"), "utf8");

    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain("PUBLIC_NAVIGATIONS.has(pathname)");
    expect(source).not.toMatch(/PUBLIC_NAVIGATIONS[\s\S]*new Set\(\[[\s\S]*"\/",/);
    expect(source).toContain('const OFFLINE_URL = "/offline"');
  });
});
