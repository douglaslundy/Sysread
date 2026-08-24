// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

function renderLibrary(authenticated = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LibraryPreview authenticated={authenticated} />
    </NextIntlClientProvider>,
  );
}

describe("library view", () => {
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
});