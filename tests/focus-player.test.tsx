// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { FocusPlayer } from "../src/modules/focus/ui/focus-player";

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
  wordsPerBlock: 1 as const,
  wpm: 350,
  verticalDirection: "up" as const,
};

describe("focus player", () => {
  it("supports controls, keyboard exit and exact checkpoints", async () => {
    const user = userEvent.setup();
    const onCheckpoint = vi.fn(async () => undefined);
    const onClose = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FocusPlayer
          chapter={{
            id: "chapter-1", order: 0, text: "alpha beta gamma", textVersionHash: "hash",
            title: "Chapter", variant: "original", wordCount: 3,
          }}
          initialWordIndex={0}
          onCheckpoint={onCheckpoint}
          onClose={onClose}
          onComplete={vi.fn()}
          settings={settings}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("alpha");
    await user.click(screen.getByRole("button", { name: "Next words" }));
    expect(screen.getByRole("status")).toHaveTextContent("beta");
    await waitFor(() => expect(onCheckpoint).toHaveBeenCalledWith(1));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onCheckpoint).toHaveBeenLastCalledWith(1);
  });

  it("keeps a three-word block on one accessible line with preserved spaces", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FocusPlayer
          chapter={{ id: "chapter-2", order: 0, text: "alpha beta gamma", textVersionHash: "hash", title: "Chapter", variant: "original", wordCount: 3 }}
          initialWordIndex={0}
          onCheckpoint={async () => undefined}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          settings={{ ...settings, wordsPerBlock: 3 }}
        />
      </NextIntlClientProvider>,
    );
    const block = screen.getByRole("status", { name: "alpha beta gamma" });
    expect(block).toHaveTextContent("alpha beta gamma");
    expect(block).toHaveStyle({ fontSize: "88px" });
  });

  it.each([
    ["vertical down", { focusPresentation: "vertical" as const, verticalDirection: "down" as const }, "motion-down"],
    ["vertical up", { focusPresentation: "vertical" as const, verticalDirection: "up" as const }, "motion-up"],
    ["horizontal left to right", { focusPresentation: "horizontal" as const }, "motion-left-to-right"],
    ["horizontal right to left", { focusPresentation: "horizontal" as const, horizontalDirection: "right-to-left" as const }, "motion-right-to-left"],
  ])("renders the %s motion presentation", (_name, preference, expectedClass) => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FocusPlayer
          chapter={{ id: "chapter-motion", order: 0, text: "alpha beta", textVersionHash: "hash", title: "Chapter", variant: "original", wordCount: 2 }}
          initialWordIndex={0}
          onCheckpoint={async () => undefined}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          settings={{ ...settings, ...preference }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("status")).toHaveClass("focus-motion-word", expectedClass);
  });
});
