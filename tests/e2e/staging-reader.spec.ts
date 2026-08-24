import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const stagingAuthCookie = process.env.E2E_AUTH_COOKIE;
test.skip(!stagingAuthCookie, "Set E2E_AUTH_COOKIE to run the authenticated reader journey.");

async function mockReaderApi(page: Page) {
  await page.route("**/api/me/reading-settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        settings: {
          autoAdvance: false,
          boostMode: false,
          focusPresentation: "orp",
          fontFamily: "serif",
          fontSize: "large",
          horizontalDirection: "left-to-right",
          wordsPerBlock: 1,
          wpm: 350,
          verticalDirection: "up",
        },
      }),
    }),
  );
  await page.route("**/api/contents/book-e2e/progress", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().method() === "PUT" ? { progress: { revision: 1 } } : { progress: null },
      ),
    }),
  );
  await page.route("**/api/contents/book-e2e/chapters/chapter-1?variant=*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        chapter: {
          id: "chapter-1",
          order: 0,
          text: "Sysread turns focused practice into a sustainable reading habit.\n\nThe second paragraph verifies navigation and progress.",
          textVersionHash: "e2e-original-v1",
          title: "A focused beginning",
          variant: "original",
          wordCount: 17,
        },
      }),
    }),
  );
  await page.route("**/api/contents/book-e2e/chapters", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        chapters: [{ id: "chapter-1", order: 0, title: "A focused beginning", wordCount: 17 }],
      }),
    }),
  );
  await page.route("**/api/contents/book-e2e", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        content: {
          author: "Sysread",
          cleanupLevel: "standard",
          id: "book-e2e",
          kind: "personal",
          processingStatus: "ready",
          sourceType: "upload_pdf",
          title: "E2E Reading Fixture",
          updatedAt: "2026-08-17T12:00:00.000Z",
        },
      }),
    }),
  );
}

test("reader and Focus work with keyboard, responsive layout and WCAG AA", async ({ baseURL, context, page }, testInfo) => {
  await context.addCookies([{ name: "readcoach_session", value: stagingAuthCookie!, url: baseURL! }]);
  await mockReaderApi(page);
  await page.goto("/reader/book-e2e");

  await expect(page.getByRole("heading", { level: 1, name: "E2E Reading Fixture" })).toBeVisible();
  await expect(page.getByText("Sysread turns focused practice")).toBeVisible();
  await expect(page.getByRole("complementary", { name: /(Focus|Foco)/i })).toBeVisible();

  await page.getByRole("button", { name: /(Start focus|Iniciar foco)/i }).click();
  await expect(page.getByRole("button", { name: /(Close|Fechar)/i })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /(Pause|Pausar)/i })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /(Start focus|Iniciar foco)/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("reader-focus.png") });
});
