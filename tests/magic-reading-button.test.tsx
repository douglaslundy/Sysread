// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { MagicReadingButton } from "../src/modules/magic/ui/magic-reading-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("magic reading button", () => {
  it("requests a job, follows it, and activates the ready variant", async () => {
    const onReady = vi.fn();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "job-1", state: "queued" }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ job: { state: "completed" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MagicReadingButton chapterId="chapter-1" onReady={onReady} />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Simplify/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenNthCalledWith(1, "/api/chapters/chapter-1/simplifications", expect.objectContaining({ method: "POST" }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "/api/jobs/job-1");
  });

  it("offers a retry after a safe request failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MagicReadingButton chapterId="chapter-1" onReady={vi.fn()} />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Simplify/i }));
    expect(await screen.findByRole("button", { name: /Try again/i })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("could not be prepared");
  });
});
