// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { SelectionNoteBubble } from "../src/modules/notes/ui/selection-note-bubble";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.getSelection()?.removeAllRanges();
});

function selectText(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function renderBubble() {
  const containerRef = createRef<HTMLDivElement>();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <div data-testid="container" ref={containerRef}>
        <p data-reader-anchor="paragraph-1">Selected sentence here.</p>
      </div>
      <SelectionNoteBubble chapterId="chapter-1" containerRef={containerRef} contentId="book-1" />
    </NextIntlClientProvider>,
  );
}

describe("selection note bubble", () => {
  it("offers to save a note after selecting text inside the reader", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ note: {} }), { status: 200 }));
    renderBubble();
    const paragraph = screen.getByText("Selected sentence here.");
    selectText(paragraph);
    fireEvent.mouseUp(document);

    await user.click(await screen.findByRole("button", { name: "Save note" }));
    await user.type(screen.getByLabelText("Note title"), "Key idea");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Note saved.")).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith("/api/notes", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      chapterId: "chapter-1", contentId: "book-1", excerpt: "Selected sentence here.",
      paragraphAnchor: "paragraph-1", title: "Key idea",
    });
  });

  it("hides again once the selection is cleared without saving", () => {
    renderBubble();
    const paragraph = screen.getByText("Selected sentence here.");
    selectText(paragraph);
    fireEvent.mouseUp(document);
    expect(screen.getByRole("button", { name: "Save note" })).toBeVisible();

    window.getSelection()?.removeAllRanges();
    fireEvent.mouseUp(document);
    expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
  });

  it("shows an inline error and keeps the draft when saving fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    renderBubble();
    const paragraph = screen.getByText("Selected sentence here.");
    selectText(paragraph);
    fireEvent.mouseUp(document);

    await user.click(await screen.findByRole("button", { name: "Save note" }));
    await user.type(screen.getByLabelText("Note title"), "Key idea");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The note could not be saved.");
    expect(screen.getByLabelText("Note title")).toHaveValue("Key idea");
  });
});
