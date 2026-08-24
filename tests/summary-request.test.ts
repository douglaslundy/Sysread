import { describe, expect, it, vi } from "vitest";
import {
  DuplicateSummaryRequestError,
  SummaryRequestService,
  normalizeBookField,
  type SummaryRequestRecord,
  type SummaryRequestRepository,
} from "../src/modules/catalog/application/summary-request-service";

describe("summary requests", () => {
  it("normalizes accents, case and punctuation for duplicate detection", () => {
    expect(normalizeBookField("  A Psicologia do Dinheiro! ")).toBe(
      "a psicologia do dinheiro",
    );
  });

  it("creates a normalized request owned by the session user", async () => {
    const created: SummaryRequestRecord = {
      authorRequested: "Morgan Housel",
      id: "request-id",
      status: "pending",
      titleRequested: "The Psychology of Money",
      userId: "session-user",
    };
    const repository: SummaryRequestRepository = {
      create: vi.fn(async () => created),
      findDuplicate: vi.fn(async () => null),
    };

    const result = await new SummaryRequestService(repository).create({
      author: " Morgan Housel ",
      title: " The Psychology of Money ",
      userId: "session-user",
    });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authorNormalized: "morgan housel",
        titleNormalized: "the psychology of money",
        userId: "session-user",
      }),
    );
  });

  it("returns the existing request instead of creating a duplicate", async () => {
    const existing: SummaryRequestRecord = {
      authorRequested: "Author",
      id: "existing-id",
      status: "pending",
      titleRequested: "Book",
      userId: "user-id",
    };
    const repository: SummaryRequestRepository = {
      create: vi.fn(),
      findDuplicate: vi.fn(async () => existing),
    };

    await expect(
      new SummaryRequestService(repository).create({
        author: "Author",
        title: "Book",
        userId: "user-id",
      }),
    ).rejects.toBeInstanceOf(DuplicateSummaryRequestError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});