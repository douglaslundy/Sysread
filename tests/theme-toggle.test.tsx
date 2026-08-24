// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { ThemeToggle } from "../src/components/theme-toggle";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.dataset.theme = "system";
});

describe("theme toggle", () => {
  it("switches immediately from dark to light and persists the choice", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ThemeToggle initialTheme="dark" />
      </NextIntlClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Use light theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/theme", expect.objectContaining({ method: "POST" })));
    expect(screen.getByRole("button", { name: "Use dark theme" })).toBeVisible();
  });
});
