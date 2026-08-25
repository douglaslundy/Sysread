// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { ReaderShell } from "../src/modules/reader/ui/reader-shell";
import { paragraphAnchor } from "../src/modules/reader/domain/text-navigation";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  push.mockReset();
  refresh.mockReset();
});

function response(body: unknown, ok = true) {
  return { json: async () => body, ok } as Response;
}

function mockReader(savedProgress: unknown = null) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/reading-settings")) {
      return response({ settings: { autoAdvance: false, boostMode: false, focusPresentation: "orp", fontFamily: "serif", fontSize: "large", horizontalDirection: "left-to-right", verticalDirection: "up", wordsPerBlock: 1, wpm: 350 } });
    }
    if (url.endsWith("/progress") && init?.method === "PUT") {
      return response({ progress: { revision: 1 } });
    }
    if (url.endsWith("/progress")) return response({ progress: savedProgress });
    if (url.endsWith("/chapters")) {
      return response({ chapters: [
        { id: "chapter-1", order: 0, title: "Start", wordCount: 4 },
        { id: "chapter-2", order: 1, title: "Continue", wordCount: 3 },
      ] });
    }
    if (url.includes("/chapters/chapter-")) {
      const second = url.includes("chapter-2");
      if (init?.method === "PATCH") {
        const update = JSON.parse(String(init.body)) as { text: string; title: string };
        return response({ chapter: {
          id: second ? "chapter-2" : "chapter-1", order: second ? 1 : 0,
          text: update.text, textVersionHash: "edited-hash", title: update.title,
          variant: "original", wordCount: update.text.split(/\s+/u).length,
        } });
      }
      const simplified = url.includes("variant=simplified");
      return response({ chapter: {
        id: second ? "chapter-2" : "chapter-1",
        order: second ? 1 : 0,
        text: simplified ? "Simplified text." : second ? "Second chapter text." : "First paragraph.\n\nSecond paragraph.",
        textVersionHash: simplified ? "simple-hash" : "original-hash",
        title: second ? "Continue" : "Start",
        variant: simplified ? "simplified" : "original",
        wordCount: second ? 3 : 4,
      } });
    }
    if (url.endsWith("/api/contents/book-1") && init?.method === "DELETE") {
      return response({ deleted: true });
    }
    return response({ content: {
      cleanupLevel: "standard", id: "book-1", kind: "personal", processingStatus: "ready",
      sourceType: "upload_pdf", title: "My Book", updatedAt: "2026-08-17T12:00:00.000Z",
    } });
  });
}

function renderReader() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ReaderShell contentId="book-1" />
    </NextIntlClientProvider>,
  );
}

describe("reader desktop shell", () => {
  it("loads three semantic panels and collapses both sidebars accessibly", async () => {
    const user = userEvent.setup();
    mockReader();
    renderReader();
    expect(await screen.findByRole("heading", { name: "My Book" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Chapters" })).toBeVisible();
    expect(screen.getByRole("main")).toHaveTextContent("First paragraph.");
    expect(screen.getByRole("complementary", { name: "Focus" })).toBeVisible();
    await user.click(screen.getByTitle("Collapse chapters"));
    expect(screen.getByTitle("Expand chapters")).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByTitle("Collapse focus"));
    expect(screen.getByTitle("Expand focus")).toHaveAttribute("aria-expanded", "false");
  });

  it("changes chapters, active version, typography and current paragraph", async () => {
    const user = userEvent.setup();
    const fetchMock = mockReader();
    renderReader();
    expect(await screen.findByText("First paragraph.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next chapter" }));
    expect(await screen.findByText("Second chapter text.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Simplified" }));
    expect(await screen.findByText("Simplified text.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Simplified" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Sans" }));
    await user.click(screen.getByRole("button", { name: "Extra large text" }));
    expect(screen.getByRole("article")).toHaveClass("font-sans", "size-xlarge");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/contents/book-1/chapters/chapter-2?variant=simplified",
      { signal: undefined },
    ));
  });

  it("restores the saved chapter and text version", async () => {
    const fetchMock = mockReader({
      chapterId: "chapter-2", completed: false, contentId: "book-1",
      paragraphAnchor: "missing-anchor", percent: 40, revision: 3,
      textVariant: "simplified", textVersionHash: "simple-hash",
      updatedAt: "2026-08-17T12:00:00.000Z", wordIndex: 1,
    });
    renderReader();
    expect(await screen.findByText("Simplified text.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Continue" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contents/book-1/chapters/chapter-2?variant=simplified",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("resumes focus at the saved paragraph and word", async () => {
    const user = userEvent.setup();
    mockReader({
      chapterId: "chapter-1", completed: false, contentId: "book-1",
      paragraphAnchor: paragraphAnchor("Second paragraph.", 1), percent: 75, revision: 3,
      textVariant: "original", textVersionHash: "original-hash",
      updatedAt: "2026-08-17T12:00:00.000Z", wordIndex: 3,
    });
    renderReader();
    const resumedParagraph = await screen.findByText("Second paragraph.");
    await waitFor(() => expect(resumedParagraph).toHaveAttribute("aria-current", "location"));
    await user.click(screen.getAllByRole("button", { name: "Start reading" })[0]);
    expect(await screen.findByRole("region", { name: "Focus reader" })).toHaveTextContent("paragraph.");
    expect(screen.getByText("Start · 2/2")).toBeVisible();
  });

  it("flushes the current paragraph checkpoint on page hide", async () => {
    const user = userEvent.setup();
    const fetchMock = mockReader();
    renderReader();
    const paragraph = await screen.findByText("Second paragraph.");
    await user.click(paragraph);
    expect(screen.getByText("Paragraph 2 of 2")).toBeVisible();
    window.dispatchEvent(new Event("pagehide"));
    await waitFor(() => {
      const save = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
      expect(save).toBeDefined();
      const body = JSON.parse(String(save?.[1]?.body));
      expect(body.paragraphAnchor).toBe(paragraph.id);
      expect(body.revision).toBe(0);
    });
  });

  it("edits the current imported chapter and can delete the owned material", async () => {
    const user = userEvent.setup();
    const fetchMock = mockReader();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderReader();

    await screen.findByText("First paragraph.");
    await user.click(screen.getByRole("button", { name: "Edit content" }));
    const title = screen.getByLabelText("Chapter title");
    const text = screen.getByLabelText("Chapter text");
    await user.clear(title);
    await user.type(title, "Edited chapter");
    await user.clear(text);
    await user.type(text, "Edited text for reading.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Edited text for reading.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contents/book-1/chapters/chapter-1",
      expect.objectContaining({ method: "PATCH" }),
    );

    await user.click(screen.getByRole("button", { name: "Edit content" }));
    await user.click(screen.getByRole("button", { name: "Delete material" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/contents/book-1", { method: "DELETE" });
  });
});
