import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET as health } from "../src/app/api/health/route";
import PrivacyPage from "../src/app/privacy/page";
import TermsPage from "../src/app/terms/page";

describe("release contracts", () => {
  it("publishes provider-aligned provisional legal drafts", async () => {
    const privacy = renderToStaticMarkup(await PrivacyPage());
    const terms = renderToStaticMarkup(await TermsPage());
    expect(privacy).toContain("OpenAI");
    expect(privacy).toContain("Mercado Pago");
    expect(privacy).toContain("Provisional legal text");
    expect(privacy).toContain("[REPLACE: LEGAL OPERATOR NAME]");
    expect(terms).toContain("US$97");
    expect(terms).toContain("US$4.99");
    expect(terms).toContain("Provisional legal text");
    expect(terms).toContain("[REPLACE: GOVERNING LAW]");
  });

  it("exposes a cache-free liveness response", async () => {
    const response = health();
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ service: "readcoach", status: "ok" });
  });

  it("ships security, privacy, CI, smoke and rollback controls", () => {
    expect(readFileSync("next.config.ts", "utf8")).toContain("Content-Security-Policy");
    expect(readFileSync("next.config.ts", "utf8")).toContain("https://www.youtube-nocookie.com");
    expect(readFileSync("docs/security/threat-model.md", "utf8")).toContain("Prompt injection");
    expect(readFileSync("docs/operations/runbook.md", "utf8")).toContain("dead_lettered");
    expect(readFileSync("docs/release.md", "utf8")).toContain("Rollback");
    expect(readFileSync(".github/workflows/ci.yml", "utf8")).toContain("npm run test");
    expect(readFileSync(".github/workflows/ci.yml", "utf8")).toContain("npm run test:e2e");
    expect(readFileSync("playwright.config.ts", "utf8")).toContain("desktop-chromium");
    expect(readFileSync("docs/testing/e2e.md", "utf8")).toContain("WCAG");
    expect(readFileSync("src/modules/privacy/application/purge-deleted-users.ts", "utf8")).toContain("lifecycleStatus: \"deleted\"");
    expect(readFileSync("vercel.json", "utf8")).toContain("/api/cron/jobs");
    expect(readFileSync("vercel.json", "utf8")).toContain("/api/cron/privacy");
    expect(readFileSync("scripts/prepare-cpanel.mjs", "utf8")).toContain(".next");
    expect(readFileSync("docs/deployment-topologies.md", "utf8")).toContain("CONTENT_STORAGE_PROVIDER=s3");
    expect(readFileSync("src/app/api/ready/route.ts", "utf8")).toContain('status: "ready"');
    expect(readFileSync("docker-compose.yml", "utf8")).toContain("uploads-data");
    expect(readFileSync("docker-compose.yml", "utf8")).toContain("mem_limit: 768m");
    expect(readFileSync("docker-compose.yml", "utf8")).toContain("pids_limit:");
    expect(readFileSync("Dockerfile", "utf8")).toContain("chown -R nextjs:nodejs /app/.data");
    expect(readFileSync("deploy/setup-vps-test.sh", "utf8")).toContain("chown -R 1001:1001 /app/.data/uploads");
    expect(readFileSync("src/app/api/me/export/route.ts", "utf8")).toContain("no-store");
  });
});
