// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { SummaryRequestDialog } from "../src/modules/catalog/ui/summary-request-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDialog(authenticated: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SummaryRequestDialog authenticated={authenticated} />
    </NextIntlClientProvider>,
  );
}

describe("summary request dialog", () => {
  it("asks unauthenticated readers to sign in", async () => {
    const user = userEvent.setup();
    renderDialog(false);

    await user.click(screen.getByRole("button", { name: "Request a summary" }));
    expect(screen.getByText("Sign in to request a summary.")).toBeVisible();
  });

  it("submits title and author for authenticated readers", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 201 } as Response);
    renderDialog(true);

    await user.click(screen.getByRole("button", { name: "Request a summary" }));
    await user.type(screen.getByRole("textbox", { name: "Book title" }), "Flow");
    await user.type(
      screen.getByRole("textbox", { name: "Author" }),
      "Mihaly Csikszentmihalyi",
    );
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/summary-requests",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("Request submitted.")).toBeVisible();
  });
});