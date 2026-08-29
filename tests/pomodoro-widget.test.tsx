// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import en from "../src/messages/en.json";
import { createInitialPomodoro, startPomodoro } from "../src/modules/pomodoro/domain/pomodoro-cycle";
import { pomodoroStorageKey } from "../src/modules/pomodoro/infrastructure/pomodoro-storage";
import { PomodoroWidget } from "../src/modules/pomodoro/ui/pomodoro-widget";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function show() {
  return render(<NextIntlClientProvider locale="en" messages={en}><PomodoroWidget /></NextIntlClientProvider>);
}

describe("Pomodoro widget", () => {
  it("starts, pauses and resumes without leaving the current screen", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("timer")).toHaveTextContent("25:00");
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(localStorage.getItem(pomodoroStorageKey)).toContain('"status":"running"'));
  });

  it("restores an elapsed stage, alerts visually and waits for confirmation", async () => {
    const elapsed = startPomodoro(createInitialPomodoro(), Date.now() - 26 * 60_000);
    localStorage.setItem(pomodoroStorageKey, JSON.stringify(elapsed));
    const user = userEvent.setup();
    show();

    expect(await screen.findByRole("button", { name: "Confirm" })).toBeVisible();
    expect(screen.getByLabelText("Pomodoro timer")).toHaveClass("is-alerting");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Short break")).toBeVisible();
    expect(screen.getByRole("timer")).toHaveTextContent("05:00");
  });

  it("validates and saves editable durations and sound preference", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Expand Pomodoro" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const study = screen.getByLabelText("Study (minutes)");
    await user.clear(study);
    await user.type(study, "30");
    await user.click(screen.getByLabelText("Play sound alert"));
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(localStorage.getItem(pomodoroStorageKey)).toContain('"studyMinutes":30'));
    expect(localStorage.getItem(pomodoroStorageKey)).toContain('"soundEnabled":false');
  });
});
