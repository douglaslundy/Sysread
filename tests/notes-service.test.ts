import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/db/mongodb", () => ({ connectToMongo: vi.fn().mockResolvedValue(undefined) }));

import { ContentModel } from "../src/modules/catalog/infrastructure/content.model";
import { MongoReaderRepository } from "../src/modules/reader/infrastructure/reader-repository";
import { createNote, deleteOwnNote, listOwnNotes, NoteError } from "../src/modules/notes/application/note-service";
import { NoteModel } from "../src/modules/notes/infrastructure/note.model";

afterEach(() => vi.restoreAllMocks());

function allowChapterAccess() {
  vi.spyOn(MongoReaderRepository.prototype, "findReadableContent").mockResolvedValue({
    cleanupLevel: "standard", id: "content-1", kind: "personal", processingStatus: "ready",
    sourceType: "upload_pdf", title: "Book", updatedAt: "2026-08-17T12:00:00.000Z",
  });
  vi.spyOn(MongoReaderRepository.prototype, "findChapter").mockResolvedValue({
    id: "chapter-1", order: 0, text: "text", textVersionHash: "hash",
    title: "Chapter", variant: "original", wordCount: 100,
  });
}

describe("note service", () => {
  it("rejects a note for content the reader cannot access", async () => {
    vi.spyOn(MongoReaderRepository.prototype, "findReadableContent").mockResolvedValue(null);
    await expect(createNote({
      chapterId: "chapter-1", contentId: "content-1", excerpt: "Selected passage.",
      title: "Key idea", userId: "user-1",
    })).rejects.toEqual(new NoteError("INVALID_NOTE", 400));
  });

  it("stores the selected excerpt with the book title attached", async () => {
    allowChapterAccess();
    vi.spyOn(ContentModel, "findById").mockReturnValue({
      select: () => ({ lean: () => ({ exec: async () => ({ author: "Author", title: "Book" }) }) }),
    } as never);
    const create = vi.spyOn(NoteModel, "create").mockResolvedValue({
      _id: new Types.ObjectId("64a000000000000000000001"),
      chapterId: new Types.ObjectId("64a000000000000000000002"),
      contentId: new Types.ObjectId("64a000000000000000000003"),
      createdAt: new Date("2026-08-26T12:00:00.000Z"),
      excerpt: "Selected passage.",
      paragraphAnchor: "paragraph-1-abc",
      title: "Key idea",
    } as never);

    const note = await createNote({
      chapterId: "64a000000000000000000002", contentId: "64a000000000000000000003",
      excerpt: "Selected passage.", paragraphAnchor: "paragraph-1-abc",
      title: "Key idea", userId: "64a000000000000000000009",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ excerpt: "Selected passage.", title: "Key idea" }));
    expect(note).toMatchObject({ contentAuthor: "Author", contentTitle: "Book", excerpt: "Selected passage.", title: "Key idea" });
  });

  it("lists only the requesting reader's notes with each book title attached", async () => {
    const userId = new Types.ObjectId();
    const contentId = new Types.ObjectId();
    vi.spyOn(NoteModel, "find").mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => ({ exec: async () => [{
        _id: new Types.ObjectId(), chapterId: new Types.ObjectId(), contentId,
        createdAt: new Date("2026-08-26T12:00:00.000Z"), excerpt: "Passage.", title: "Key idea",
      }] }) }) }),
    } as never);
    vi.spyOn(ContentModel, "find").mockReturnValue({
      select: () => ({ lean: () => ({ exec: async () => [{ _id: contentId, title: "Book" }] }) }),
    } as never);

    const notes = await listOwnNotes(userId.toString());
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ contentTitle: "Book", excerpt: "Passage.", title: "Key idea" });
  });

  it("only deletes a note the requesting reader owns", async () => {
    const remove = vi.spyOn(NoteModel, "deleteOne").mockReturnValue({ exec: async () => ({ deletedCount: 0 }) } as never);
    await expect(deleteOwnNote({ noteId: new Types.ObjectId().toString(), userId: new Types.ObjectId().toString() }))
      .rejects.toEqual(new NoteError("NOTE_NOT_FOUND", 404));
    expect(remove).toHaveBeenCalled();
  });
});
