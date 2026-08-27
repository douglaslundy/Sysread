import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  { heading: "Read faster. Understand more.", path: "/pricing" },
  { heading: "Privacy Policy", path: "/privacy" },
  { heading: "Terms of Service", path: "/terms" },
] as const;

for (const publicPage of publicPages) {
  test(`${publicPage.path} is accessible and visually contained`, async ({ page }, testInfo) => {
    await page.goto(publicPage.path);
    await expect(page.getByRole("heading", { level: 1, name: publicPage.heading })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ fullPage: true, path: testInfo.outputPath(`${publicPage.path.slice(1)}.png`) });
  });
}

test("public navigation, focus visibility and health contract work end to end", async ({ page, request }) => {
  await page.goto("/pricing");
  await page.locator("a.brand").first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /(Personal library|Biblioteca pessoal)/i })).toBeVisible();

  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const outlineStyle = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outlineStyle).not.toBe("none");

  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });
});

test("public shell stays within release performance budgets", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      domNodes: document.getElementsByTagName("*").length,
      transferredBytes: navigation.transferSize + resources.reduce((sum, item) => sum + item.transferSize, 0),
    };
  });

  expect(metrics.domContentLoaded).toBeLessThan(5_000);
  expect(metrics.domNodes).toBeLessThan(600);
  expect(metrics.transferredBytes).toBeLessThan(2_000_000);
});
test("library matches the responsive visual contract and has no WCAG AA violations", async ({ page }, testInfo) => {
  await page.route("**/api/summaries**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            author: "Sysread Studio",
            category: "productivity",
            id: "summary-e2e-1",
            kind: "summary",
            title: "Deep Reading",
            updatedAt: "2026-08-17T12:00:00.000Z",
          },
          {
            author: "Sysread Studio",
            category: "psychology",
            id: "summary-e2e-2",
            kind: "summary",
            title: "Attention by Design",
            updatedAt: "2026-08-17T12:00:00.000Z",
          },
        ],
        nextCursor: null,
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /(Personal library|Biblioteca pessoal)/i })).toBeVisible();
  const protectedBook = page.getByRole("button", { name: /Deep Reading/i });
  await expect(protectedBook).toBeVisible();
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("library.png") });
  await protectedBook.click();
  await expect(page.getByRole("dialog", { name: /Sign in to|Entrar no/i })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("tab", { name: /Create account|Criar conta/i })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("auth-prompt.png") });
});
