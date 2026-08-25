import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentModel } from "../src/modules/catalog/infrastructure/content.model";
import { publishApprovedContent } from "../src/modules/publication/application/publication-service";
import { PublicationRequestModel } from "../src/modules/publication/infrastructure/publication-request.model";

afterEach(() => vi.restoreAllMocks());

describe("publication service", () => {
  it("publishes only an approved and fully processed submission", async () => {
    const contentId = new Types.ObjectId();
    vi.spyOn(PublicationRequestModel, "findOne").mockReturnValue({
      lean: () => ({ exec: async () => ({ contentId, status: "approved" }) }),
    } as never);
    const update = vi.spyOn(ContentModel, "updateOne").mockReturnValue({
      exec: async () => ({ modifiedCount: 1 }),
    } as never);

    await expect(publishApprovedContent(contentId)).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      { _id: contentId, processingStatus: "ready" },
      { $set: expect.objectContaining({ kind: "public", visibility: "public" }) },
    );
  });

  it("does not publish a submission without approval", async () => {
    const contentId = new Types.ObjectId();
    vi.spyOn(PublicationRequestModel, "findOne").mockReturnValue({
      lean: () => ({ exec: async () => null }),
    } as never);
    const update = vi.spyOn(ContentModel, "updateOne");
    await expect(publishApprovedContent(contentId)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
