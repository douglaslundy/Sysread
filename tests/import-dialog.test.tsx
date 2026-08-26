// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { ImportDialog } from "../src/modules/imports/ui/import-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); refresh.mockReset(); });

function show(authenticated: boolean, role: "admin" | "user" = "user") {
  render(<NextIntlClientProvider locale="en" messages={en}><ImportDialog authenticated={authenticated} categories={[{ id: "category-1", name: "Technology" }]} role={role} /></NextIntlClientProvider>);
}

describe("import dialog", () => {
  it("requires authentication before showing import forms", async () => {
    show(false);
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByText("Sign in to import private content.")).toBeVisible();
  });

  it("uploads a file, follows the job and refreshes the library", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "job-1", contentId: "content-1" }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ job: { progress: 100, state: "completed", statusCode: "COMPLETED" } }), { status: 200 }));
    show(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.selectOptions(screen.getByLabelText("Category"), "category-1");
    await user.click(screen.getByRole("switch", { name: /Import content only/ }));
    await user.click(screen.getByRole("switch", { name: /Make available to all users/ }));
    await user.upload(screen.getByLabelText("Choose a file"), new File(["%PDF-1.7"], "book.pdf", { type: "application/pdf" }));
    fireEvent.submit(screen.getByRole("button", { name: "Upload and process" }).closest("form")!);

    expect(await screen.findByText("Import complete")).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/imports", expect.objectContaining({ method: "POST" }));
    const form = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(form.get("contentOnly")).toBe("true");
    expect(form.get("categoryId")).toBe("category-1");
    expect(form.get("publicationRequested")).toBe("true");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("explains direct public publishing to administrators", async () => {
    show(true, "admin");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByText(/published directly to the public library/i)).toBeVisible();
  });

  it("submits an article URL and shows a safe server error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "The destination is not allowed." } }), { status: 400 }),
    );
    show(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(screen.getByRole("tab", { name: "Article URL" }));
    await user.selectOptions(screen.getByLabelText("Category"), "category-1");
    await user.type(screen.getByLabelText("Public article URL"), "http://localhost/");
    await user.click(screen.getByRole("button", { name: "Import article" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("destination is not allowed"));
  });

  it("explains when the upload volume is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "STORAGE_UNAVAILABLE", message: "Private upload storage is temporarily unavailable." } }), { status: 503 }),
    );
    show(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.selectOptions(screen.getByLabelText("Category"), "category-1");
    await user.upload(screen.getByLabelText("Choose a file"), new File(["%PDF-1.7"], "book.pdf", { type: "application/pdf" }));
    fireEvent.submit(screen.getByRole("button", { name: "Upload and process" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Book storage is temporarily unavailable.");
  });
});
