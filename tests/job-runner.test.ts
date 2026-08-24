import { describe, expect, it, vi } from "vitest";
import {
  JobExecutionError,
  JobRunner,
} from "../src/modules/jobs/application/job-runner";
import type {
  ClaimedJob,
  JobRepository,
} from "../src/modules/jobs/application/types";

const claimed: ClaimedJob = {
  attempts: 1,
  id: "507f1f77bcf86cd799439012",
  kind: "import_pdf",
  lockToken: "lease-token",
  maxAttempts: 3,
  ownerId: "507f1f77bcf86cd799439011",
  subjectId: "507f1f77bcf86cd799439013",
};

function repository(job: ClaimedJob | null = claimed): JobRepository {
  return {
    claimNext: vi.fn(async () => job),
    complete: vi.fn(async () => true),
    deadLetter: vi.fn(async () => true),
    findOwned: vi.fn(async () => null),
    reportProgress: vi.fn(async () => true),
    retry: vi.fn(async () => true),
  };
}

describe("leased job runner", () => {
  it("claims, reports monotonic progress and completes", async () => {
    const repo = repository();
    const handler = vi.fn(async (_job, context) => {
      await context.reportProgress(40.9, "PARSING");
      await context.reportProgress(20, "invalid status");
    });
    const runner = new JobRunner(repo, { import_pdf: handler });

    expect(await runner.runNext()).toBe(true);
    expect(repo.reportProgress).toHaveBeenNthCalledWith(
      1,
      claimed,
      40,
      "PARSING",
      expect.any(Date),
      60_000,
    );
    expect(repo.reportProgress).toHaveBeenNthCalledWith(
      2,
      claimed,
      40,
      "PROCESSING",
      expect.any(Date),
      60_000,
    );
    expect(repo.complete).toHaveBeenCalledOnce();
  });

  it("schedules exponential retry for a retryable stable error", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const repo = repository({ ...claimed, attempts: 2 });
    const runner = new JobRunner(
      repo,
      {
        import_pdf: async () => {
          throw new JobExecutionError("PARSE_FAILED", true, "Try again safely.");
        },
      },
      { baseRetryMs: 1000, clock: () => now },
    );

    await runner.runNext();
    expect(repo.retry).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 2 }),
      { code: "PARSE_FAILED", message: "Try again safely." },
      new Date("2026-01-01T00:00:02.000Z"),
    );
    expect(repo.deadLetter).not.toHaveBeenCalled();
  });

  it("dead-letters permanent failures and exhausted retries", async () => {
    const permanentRepo = repository();
    await new JobRunner(permanentRepo, {
      import_pdf: async () => {
        throw new JobExecutionError("UNSUPPORTED_FILE", false, "Unsupported file.");
      },
    }).runNext();
    expect(permanentRepo.deadLetter).toHaveBeenCalledWith(
      claimed,
      { code: "UNSUPPORTED_FILE", message: "Unsupported file." },
      expect.any(Date),
    );

    const exhausted = { ...claimed, attempts: 3 };
    const exhaustedRepo = repository(exhausted);
    await new JobRunner(exhaustedRepo, {
      import_pdf: async () => {
        throw new Error("secret parser detail");
      },
    }).runNext();
    expect(exhaustedRepo.deadLetter).toHaveBeenCalledWith(
      exhausted,
      {
        code: "INTERNAL_JOB_ERROR",
        message: "The background task failed temporarily.",
      },
      expect.any(Date),
    );
  });

  it("does not claim work when no handlers are registered", async () => {
    const repo = repository();
    expect(await new JobRunner(repo, {}).runNext()).toBe(false);
    expect(repo.claimNext).not.toHaveBeenCalled();
  });
});