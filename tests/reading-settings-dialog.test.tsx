// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { ReadingSettingsDialog } from "../src/modules/settings/ui/reading-settings-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const settings = {
  autoAdvance: false,
  boostMode: false,
  focusPresentation: "orp" as const,
  fontFamily: "serif" as const,
  fontSize: "large" as const,
  horizontalDirection: "left-to-right" as const,
  navigationWordStep: 5 as const,
  wordsPerBlock: 1 as const,
  wpm: 350,
  verticalDirection: "up" as const,
};

describe("reading settings dialog", () => {
  it("saves global preferences and the per-book cleanup override", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (!init?.method) return { json: async () => ({ settings }), ok: true } as Response;
      if (url.endsWith("/cleanup")) return { json: async () => ({ cleanup: { level: "light" } }), ok: true } as Response;
      return { json: async () => ({ settings: { ...settings, boostMode: true, fontFamily: "sans" } }), ok: true } as Response;
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReadingSettingsDialog
          allowCleanup
          contentId="book-1"
          initialCleanup="standard"
          onApply={onApply}
        />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeVisible();
    await user.click(screen.getByRole("switch", { name: /^Boost mode/ }));
    await user.click(screen.getByRole("button", { name: "Sans" }));
    await user.click(screen.getByRole("button", { name: "Horizontal flow" }));
    await user.click(screen.getByRole("switch", { name: /^Horizontal direction/ }));
    await user.click(screen.getByRole("button", { name: "Vertical flow" }));
    await user.click(screen.getByRole("switch", { name: /^Vertical direction/ }));
    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(screen.getByRole("button", { name: "Light" }));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => expect(screen.getByText("Settings saved.")).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contents/book-1/cleanup",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({
      boostMode: true,
      fontFamily: "sans",
    }));
    const settingsCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("reading-settings") && init?.method === "PATCH");
    expect(JSON.parse(String(settingsCall?.[1]?.body))).toEqual(expect.objectContaining({
      focusPresentation: "vertical",
      horizontalDirection: "right-to-left",
      navigationWordStep: 10,
      verticalDirection: "down",
    }));
  });
});
