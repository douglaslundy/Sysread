// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { AuthControl } from "../src/modules/auth/ui/auth-control";
import { AuthRequiredActions } from "../src/modules/auth/ui/auth-required-actions";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, refresh: navigation.refresh }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  navigation.refresh.mockReset();
  navigation.push.mockReset();
});

function renderAuth(
  user: { email: string; id: string; name: string } | null = null,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthControl user={user} />
    </NextIntlClientProvider>,
  );
}

describe("authentication modal", () => {
  it("offers explicit login and registration actions for protected features", async () => {
    const user = userEvent.setup();
    render(<NextIntlClientProvider locale="en" messages={en}><AuthControl user={null} /><AuthRequiredActions /></NextIntlClientProvider>);
    expect(screen.getByText("You need to sign in to your account to continue.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("dialog", { name: "Sign in to Sysread" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeVisible();
  });

  it("submits login inside the single-page shell", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);
    renderAuth();

    await user.click(
      screen.getByRole("button", { name: "Sign in or create account" }),
    );
    expect(screen.getByRole("dialog", { name: "Sign in to Sysread" })).toBeVisible();

    await user.type(
      screen.getByRole("textbox", { name: "Email" }),
      "reader@example.com",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "a-secure-password",
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(navigation.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("logs an authenticated user out from the account modal", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);
    renderAuth({
      email: "reader@example.com",
      id: "user-id",
      name: "Reader",
    });

    await user.click(screen.getByRole("button", { name: "Open account" }));
    expect(screen.getByText("reader@example.com")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/logout",
        { method: "POST" },
      ),
    );
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});
