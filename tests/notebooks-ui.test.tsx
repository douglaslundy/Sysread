// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { NotebooksList } from "../src/modules/notes/ui/notebooks-list";
import type { NoteRow } from "../src/modules/notes/application/note-service";

const notes: NoteRow[] = [
  {
    chapterId: "chapter-1", contentAuthor: "Author A", contentId: "book-1", contentTitle: "Book One",
    createdAt: "2026-08-20T12:00:00.000Z", excerpt: "First saved excerpt.", id: "note-1", title: "Key idea",
  },
  {
    chapterId: "chapter-2", contentAuthor: "Author A", contentId: "book-1", contentTitle: "Book One",
    createdAt: "2026-08-21T12:00:00.000Z", excerpt: "Second saved excerpt.", id: "note-2", title: "Another idea",
  },
  {
    chapterId: "chapter-3", contentId: "book-2", contentTitle: "Book Two",
    createdAt: "2026-08-22T12:00:00.000Z", excerpt: "From the other book.", id: "note-3", title: "Different book",
  },
];

function renderList(rows: NoteRow[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <NotebooksList initialNotes={rows} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("my notebooks", () => {
  it("groups saved notes by book", () => {
    renderList(notes);
    const bookOne = screen.getByRole("heading", { name: "Book One" }).closest("article") as HTMLElement;
    expect(within(bookOne).getByText("Key idea")).toBeVisible();
    expect(within(bookOne).getByText("Another idea")).toBeVisible();
    const bookTwo = screen.getByRole("heading", { name: "Book Two" }).closest("article") as HTMLElement;
    expect(within(bookTwo).getByText("Different book")).toBeVisible();
  });

  it("shows an empty state when nothing has been saved yet", () => {
    renderList([]);
    expect(screen.getByText("You have not saved any notes yet. Select text while reading to save one.")).toBeVisible();
  });

  it("deletes a note after confirmation and removes it from the list", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
    renderList(notes);

    const card = screen.getByText("Key idea").closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Delete note" }));

    await waitFor(() => expect(screen.queryByText("Key idea")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/notes/note-1", expect.objectContaining({ method: "DELETE" }));
    expect(screen.getByText("Another idea")).toBeVisible();
  });
});
