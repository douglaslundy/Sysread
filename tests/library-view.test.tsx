// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { LibraryPreview } from "../src/components/library-preview";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function response(body: unknown, ok = true) {
  return { json: async () => body, ok } as Response;
}

function renderLibrary(authenticated = false, platformName = "Sysread") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LibraryPreview authenticated={authenticated} platformName={platformName} />
    </NextIntlClientProvider>,
  );
}

describe("library view", () => {
  it("uses the configured platform name in the public library title", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ items: [], nextCursor: null }));
    renderLibrary(false, "Minha Plataforma");
    expect(screen.getByRole("heading", { name: "Minha Plataforma public library" })).toBeVisible();
  });

  it("shows unauthenticated state and loads filtered summaries", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        response({
          items: [
            {
              author: "Ray Dalio",
              category: "business",
              id: "summary-1",
              kind: "summary",
              title: "Principles",
              updatedAt: "2026-08-17T12:00:00.000Z",
            },
          ],
          nextCursor: null,
        }),
    );

    renderLibrary(false);

    expect(
      screen.getByText("Sign in to create your personal library."),
    ).toBeVisible();
    expect(await screen.findByText("Principles")).toBeVisible();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by category" }),
      "biography",
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/summaries?category=biography",
      ),
    );
  });

  it("offers retry when the personal library fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.startsWith("/api/library")) return response({}, false);
        return response({ items: [], nextCursor: null });
      });

    renderLibrary(true);

    expect(
      await screen.findByText("Your library could not be loaded."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      const libraryCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/library"),
      );
      expect(libraryCalls).toHaveLength(2);
    });
  });

  it("shows cover-level edit/delete actions and lets a failed import be removed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/library") {
        return response({
          items: [
            { id: "ready-book", kind: "personal", processingStatus: "ready", title: "Readable book", updatedAt: "2026-08-25T12:00:00.000Z" },
            { coverUrl: "/api/contents/failed-book/cover", id: "failed-book", kind: "personal", processingStatus: "failed", title: "Broken MOBI", updatedAt: "2026-08-25T11:00:00.000Z" },
          ],
          nextCursor: null,
        });
      }
      if (url === "/api/contents/failed-book" && init?.method === "DELETE") {
        return response({ deleted: true });
      }
      return response({ items: [], nextCursor: null });
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderLibrary(true);

    const failedTitle = await screen.findByText("Broken MOBI");
    const failedCard = failedTitle.closest(".book-card") as HTMLElement;
    expect(within(failedCard).getByText("Import failed")).toBeVisible();
    expect(within(failedCard).getByRole("img", { name: "Cover of Broken MOBI" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/reader/ready-book?manage=1");
    await user.click(within(failedCard).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Broken MOBI")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/contents/failed-book", { method: "DELETE" });
  });
});
