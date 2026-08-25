import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/db/mongodb", () => ({ connectToMongo: vi.fn().mockResolvedValue(undefined) }));

import { ChapterModel } from "../src/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "../src/modules/catalog/infrastructure/content.model";
import { deleteOwnedChapter } from "../src/modules/imports/application/content-management-service";

afterEach(() => vi.restoreAllMocks());

describe("owned chapter deletion", () => {
  it("protects the only readable chapter of a book", async () => {
    const contentId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const chapterId = new Types.ObjectId();
    vi.spyOn(ContentModel, "findOne").mockReturnValue({ exec: async () => ({ _id: contentId }) } as never);
    vi.spyOn(ChapterModel, "findOne").mockReturnValue({ exec: async () => ({ _id: chapterId }) } as never);
    vi.spyOn(ChapterModel, "countDocuments").mockReturnValue({ exec: async () => 1 } as never);
    const remove = vi.spyOn(ChapterModel, "deleteOne");

    await expect(deleteOwnedChapter({ chapterId: chapterId.toString(), contentId: contentId.toString(), ownerId: ownerId.toString() }))
      .rejects.toMatchObject({ code: "LAST_CHAPTER", status: 409 });
    expect(remove).not.toHaveBeenCalled();
  });
});
