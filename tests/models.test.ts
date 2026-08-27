import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import {
  ChapterModel,
  ContentModel,
  JobModel,
  NoteModel,
  ReadingProgressModel,
  ReadingSettingsModel,
  ReadingSessionModel,
  RateLimitBucketModel,
  UserModel,
  chapterSchema,
  contentSchema,
  jobSchema,
  noteSchema,
  readingProgressSchema,
  readingSettingsSchema,
  readingSessionSchema,
  rateLimitBucketSchema,
  userSchema,
} from "../src/lib/db/models";

function hasIndex(
  indexes: ReturnType<typeof userSchema.indexes>,
  fields: Record<string, number>,
  unique = false,
) {
  return indexes.some(([definition, options]) => {
    const sameFields = JSON.stringify(definition) === JSON.stringify(fields);
    return sameFields && (!unique || options.unique === true);
  });
}

describe("database models", () => {
  it("normalizes users and declares one account per email", async () => {
    const user = new UserModel({
      emailNormalized: "  USER@Example.COM ",
      name: "Reader",
    });

    await user.validate();

    expect(user.emailNormalized).toBe("user@example.com");
    expect(user.locale).toBe("pt-BR");
    expect(
      hasIndex(userSchema.indexes(), { emailNormalized: 1 }, true),
    ).toBe(true);
  });

  it("enforces ownership invariants for personal and catalog content", async () => {
    const personal = new ContentModel({
      kind: "personal",
      sourceType: "upload_pdf",
      title: "Personal book",
    });
    await expect(personal.validate()).rejects.toThrow(
      "Personal content requires an owner.",
    );

    const summaryWithOwner = new ContentModel({
      kind: "summary",
      ownerId: new Types.ObjectId(),
      sourceType: "readcoach_summary",
      title: "Catalog summary",
    });
    await expect(summaryWithOwner.validate()).rejects.toThrow(
      "Catalog summaries cannot have an owner.",
    );

    const valid = new ContentModel({
      kind: "personal",
      ownerId: new Types.ObjectId(),
      sourceType: "upload_epub",
      title: "Valid book",
    });
    await expect(valid.validate()).resolves.toBeUndefined();

    const validMobi = new ContentModel({
      kind: "personal",
      ownerId: new Types.ObjectId(),
      sourceType: "upload_mobi",
      title: "Valid MOBI book",
    });
    await expect(validMobi.validate()).resolves.toBeUndefined();

    const publicSubmission = new ContentModel({
      kind: "public",
      ownerId: new Types.ObjectId(),
      processingStatus: "ready",
      publishedAt: new Date(),
      sourceType: "upload_mobi",
      title: "Approved public MOBI",
      visibility: "public",
    });
    await expect(publicSubmission.validate()).resolves.toBeUndefined();

    expect(
      hasIndex(contentSchema.indexes(), { ownerId: 1, updatedAt: -1 }),
    ).toBe(true);
  });

  it("bounds reader settings and progress", async () => {
    const invalidSettings = new ReadingSettingsModel({
      userId: new Types.ObjectId(),
      wpm: 1001,
    });
    await expect(invalidSettings.validate()).rejects.toThrow();

    const invalidProgress = new ReadingProgressModel({
      chapterId: new Types.ObjectId(),
      contentId: new Types.ObjectId(),
      percent: 101,
      textVersionHash: "sha256:value",
      userId: new Types.ObjectId(),
    });
    await expect(invalidProgress.validate()).rejects.toThrow();

    expect(
      hasIndex(readingSettingsSchema.indexes(), { userId: 1 }, true),
    ).toBe(true);
    expect(
      hasIndex(
        readingProgressSchema.indexes(),
        { userId: 1, contentId: 1 },
        true,
      ),
    ).toBe(true);
  });

  it("declares chapter order and job idempotency indexes", async () => {
    const chapter = new ChapterModel({
      contentId: new Types.ObjectId(),
      normalizedTextHash: "sha256:chapter",
      order: 0,
      originalText: "Chapter text",
      title: "Chapter",
      wordCount: 2,
    });
    const job = new JobModel({
      idempotencyKey: "import:user:content",
      kind: "import_pdf",
      ownerId: new Types.ObjectId(),
      subjectId: new Types.ObjectId(),
    });
    const mobiJob = new JobModel({
      idempotencyKey: "import:user:mobi-content",
      kind: "import_mobi",
      ownerId: new Types.ObjectId(),
      subjectId: new Types.ObjectId(),
    });

    await expect(chapter.validate()).resolves.toBeUndefined();
    await expect(job.validate()).resolves.toBeUndefined();
    await expect(mobiJob.validate()).resolves.toBeUndefined();

    expect(
      hasIndex(chapterSchema.indexes(), { contentId: 1, order: 1 }, true),
    ).toBe(true);
    expect(
      hasIndex(jobSchema.indexes(), { idempotencyKey: 1 }, true),
    ).toBe(true);
    expect(
      hasIndex(jobSchema.indexes(), { state: 1, nextAttemptAt: 1 }),
    ).toBe(true);
  });

  it("indexes reading sessions and expiring rate-limit buckets", async () => {
    const session = new ReadingSessionModel({ contentId: new Types.ObjectId(), mode: "focus", userId: new Types.ObjectId() });
    const bucket = new RateLimitBucketModel({ expiresAt: new Date(Date.now() + 60_000), key: "scope:hash:window" });
    await expect(session.validate()).resolves.toBeUndefined();
    await expect(bucket.validate()).resolves.toBeUndefined();
    expect(hasIndex(readingSessionSchema.indexes(), { userId: 1, startedAt: -1 })).toBe(true);
    expect(hasIndex(rateLimitBucketSchema.indexes(), { key: 1 }, true)).toBe(true);
  });

  it("requires a title and excerpt for study notes and indexes them per reader", async () => {
    const missingTitle = new NoteModel({
      chapterId: new Types.ObjectId(),
      contentId: new Types.ObjectId(),
      excerpt: "Selected passage.",
      userId: new Types.ObjectId(),
    });
    await expect(missingTitle.validate()).rejects.toThrow();

    const valid = new NoteModel({
      chapterId: new Types.ObjectId(),
      contentId: new Types.ObjectId(),
      excerpt: "Selected passage.",
      title: "Key idea",
      userId: new Types.ObjectId(),
    });
    await expect(valid.validate()).resolves.toBeUndefined();

    expect(hasIndex(noteSchema.indexes(), { userId: 1, createdAt: -1 })).toBe(true);
  });
});
