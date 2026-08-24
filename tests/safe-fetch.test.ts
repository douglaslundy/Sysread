import { describe, expect, it, vi } from "vitest";
import { parseReadableArticle } from "../src/modules/imports/domain/article-parser";
import {
  SafeFetchError,
  decodeHtml,
  safeFetchHtml,
  safeFetchInternals,
  validatePublicUrl,
  type HostResolver,
  type PinnedTransport,
} from "../src/modules/imports/infrastructure/safe-http-fetch";

const publicResolver: HostResolver = {
  resolve: vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]),
};

describe("SSRF-safe article fetch", () => {
  it("blocks local, private, metadata and non-http destinations", () => {
    for (const target of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://localhost/",
      "file:///etc/passwd",
      "http://public.example:8080/",
    ]) {
      expect(() => validatePublicUrl(target)).toThrow(SafeFetchError);
    }
    for (const address of ["10.0.0.1", "172.16.0.1", "192.168.1.1", "fc00::1"] ) {
      expect(() => safeFetchInternals.assertPublicAddress(address)).toThrow(SafeFetchError);
    }
    expect(() => safeFetchInternals.assertPublicAddress("93.184.216.34")).not.toThrow();
  });

  it("pins a public DNS result and revalidates every redirect", async () => {
    const request = vi
      .fn<PinnedTransport["request"]>()
      .mockResolvedValueOnce({
        body: new Uint8Array(),
        contentType: "text/html",
        location: "https://cdn.example/article",
        status: 302,
      })
      .mockResolvedValueOnce({
        body: new TextEncoder().encode("<html>article</html>"),
        contentType: "text/html; charset=utf-8",
        status: 200,
      });
    const result = await safeFetchHtml("https://example.com/start", {
      maxBytes: 1024,
      resolver: publicResolver,
      timeoutMs: 1000,
      transport: { request },
    });

    expect(result.finalUrl).toBe("https://cdn.example/article");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ address: "93.184.216.34" }),
    );
    expect(publicResolver.resolve).toHaveBeenCalledWith("cdn.example");
  });

  it("blocks a redirect whose DNS resolves to a private address", async () => {
    const resolver: HostResolver = {
      resolve: vi.fn(async (hostname) => [
        { address: hostname === "safe.example" ? "93.184.216.34" : "10.0.0.5", family: 4 as const },
      ]),
    };
    const transport: PinnedTransport = {
      request: vi.fn(async () => ({
        body: new Uint8Array(),
        contentType: "text/html",
        location: "http://internal.example/admin",
        status: 302,
      })),
    };
    await expect(
      safeFetchHtml("https://safe.example", {
        maxBytes: 1024,
        resolver,
        timeoutMs: 1000,
        transport,
      }),
    ).rejects.toMatchObject({ code: "FETCH_BLOCKED" });
    expect(transport.request).toHaveBeenCalledOnce();
  });

  it("falls back across public DNS addresses and decodes declared charset", async () => {
    const resolver: HostResolver = { resolve: vi.fn(async () => [
      { address: "2001:4860:4860::8888", family: 6 as const },
      { address: "93.184.216.34", family: 4 as const },
    ]) };
    const request = vi.fn<PinnedTransport["request"]>()
      .mockRejectedValueOnce(new Error("IPv6 route unavailable"))
      .mockResolvedValueOnce({ body: Uint8Array.from([79, 108, 225]), contentType: "text/html; charset=windows-1252", status: 200 });
    const fetched = await safeFetchHtml("https://example.com/article", { maxBytes: 100, resolver, timeoutMs: 1000, transport: { request } });
    expect(request).toHaveBeenCalledTimes(2);
    expect(decodeHtml(fetched.bytes, fetched.contentType)).toBe("Olá");
  });
});

describe("Readability article parser", () => {
  it("extracts the main article and excludes page navigation", () => {
    const paragraphs = Array.from(
      { length: 6 },
      (_, index) => `<p>Paragraph ${index + 1} contains useful reading material and enough detail for extraction.</p>`,
    ).join("");
    const article = parseReadableArticle(
      `<html><head><title>Useful Article</title></head><body><nav>Private menu</nav><article><h1>Useful Article</h1>${paragraphs}</article></body></html>`,
      "https://example.com/article",
    );
    expect(article?.title).toContain("Useful Article");
    expect(article?.text).toContain("useful reading material");
    expect(article?.text).not.toContain("Private menu");
  });

  it("captures a canonical URL from AMP markup", () => {
    const paragraphs = Array.from({ length: 6 }, () => "<p>Public article content with enough detail for the readability parser.</p>").join("");
    const article = parseReadableArticle(`<html><head><title>AMP article</title><link rel="canonical" href="/article"></head><body><article>${paragraphs}</article></body></html>`, "https://example.com/google/amp/article");
    expect(article?.canonicalUrl).toBe("https://example.com/article");
  });
});
