import { describe, expect, it, vi } from "vitest";
import {
  UploadImportService,
  UploadValidationError,
  uploadFileInternals,
} from "../src/modules/imports/application/upload-import-service";
import type {
  ImportRepository,
  PrivateObjectStorage,
} from "../src/modules/imports/application/types";

const ownerId = "507f1f77bcf86cd799439011";

function pdfBytes() {
  return new TextEncoder().encode("%PDF-1.7\nreadcoach fixture");
}

function epubBytes() {
  const name = new TextEncoder().encode("mimetype");
  const mime = new TextEncoder().encode("application/epub+zip");
  const bytes = new Uint8Array(30 + name.length + mime.length);
  bytes.set([0x50, 0x4b, 0x03, 0x04], 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(8, 0, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  bytes.set(name, 30);
  bytes.set(mime, 30 + name.length);
  return bytes;
}

function mobiBytes() {
  const bytes = new Uint8Array(68);
  bytes.set(new TextEncoder().encode("BOOKMOBI"), 60);
  return bytes;
}

function dependencies(overrides?: { existing?: boolean; quota?: boolean }) {
  const repository: ImportRepository = {
    create: vi.fn(async () => ({
      contentId: "content-1",
      created: true,
      jobId: "job-1",
    })),
    findByIdempotencyKey: vi.fn(async () =>
      overrides?.existing
        ? { contentId: "existing-content", jobId: "existing-job" }
        : null,
    ),
    releaseQuota: vi.fn(async () => undefined),
    reserveQuota: vi.fn(async () => overrides?.quota ?? true),
  };
  const storage: PrivateObjectStorage = {
    get: vi.fn(async () => new Uint8Array()),
    delete: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
  };
  return { repository, storage };
}

function service(
  repository: ImportRepository,
  storage: PrivateObjectStorage,
  maxFileBytes = 1024,
) {
  return new UploadImportService(repository, storage, {
    maxFileBytes,
    quotaBytes: 4096,
  });
}

describe("secure upload import", () => {
  it("accepts PDF by magic bytes and queues a private import", async () => {
    const { repository, storage } = dependencies();
    const result = await service(repository, storage).create({
      bytes: pdfBytes(),
      fileName: "My private book.pdf",
      ownerId,
    });

    expect(result).toEqual({ contentId: "content-1", jobId: "job-1" });
    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/pdf" }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "pdf", title: "My private book" }),
    );
  });

  it("recognizes a conformant EPUB container instead of trusting extension", () => {
    expect(uploadFileInternals.detectUploadKind(epubBytes())).toBe("epub");
    expect(
      uploadFileInternals.detectUploadKind(
        new TextEncoder().encode("not a book.epub"),
      ),
    ).toBeNull();
  });

  it("recognizes MOBI by its Palm database signature and stores the correct media type", async () => {
    expect(uploadFileInternals.detectUploadKind(mobiBytes())).toBe("mobi");
    const { repository, storage } = dependencies();

    await service(repository, storage).create({
      bytes: mobiBytes(),
      fileName: "My private book.mobi",
      ownerId,
    });

    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/x-mobipocket-ebook" }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "mobi", title: "My private book" }),
    );
  });

  it("rejects invalid, oversized and over-quota uploads before storage", async () => {
    const invalid = dependencies();
    await expect(
      service(invalid.repository, invalid.storage).create({
        bytes: new TextEncoder().encode("malware"),
        fileName: "fake.pdf",
        ownerId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_FILE", status: 415 });

    const oversized = dependencies();
    await expect(
      service(oversized.repository, oversized.storage, 4).create({
        bytes: pdfBytes(),
        fileName: "large.pdf",
        ownerId,
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE", status: 413 });

    const quota = dependencies({ quota: false });
    await expect(
      service(quota.repository, quota.storage).create({
        bytes: pdfBytes(),
        fileName: "book.pdf",
        ownerId,
      }),
    ).rejects.toBeInstanceOf(UploadValidationError);
    expect(quota.storage.put).not.toHaveBeenCalled();
  });

  it("returns an idempotent job without reserving quota or writing again", async () => {
    const { repository, storage } = dependencies({ existing: true });
    const result = await service(repository, storage).create({
      bytes: pdfBytes(),
      fileName: "same.pdf",
      ownerId,
    });

    expect(result.jobId).toBe("existing-job");
    expect(repository.reserveQuota).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("releases quota and removes the private object when persistence fails", async () => {
    const { repository, storage } = dependencies();
    vi.mocked(repository.create).mockRejectedValueOnce(new Error("db down"));

    await expect(
      service(repository, storage).create({
        bytes: pdfBytes(),
        fileName: "book.pdf",
        ownerId,
      }),
    ).rejects.toThrow("db down");
    expect(storage.delete).toHaveBeenCalledOnce();
    expect(repository.releaseQuota).toHaveBeenCalledOnce();
  });

  it("returns a safe service error and releases quota when private storage is not writable", async () => {
    const { repository, storage } = dependencies();
    vi.mocked(storage.put).mockRejectedValueOnce(Object.assign(new Error("permission denied"), { code: "EACCES" }));

    await expect(service(repository, storage).create({
      bytes: pdfBytes(),
      fileName: "book.pdf",
      ownerId,
    })).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE", status: 503 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.releaseQuota).toHaveBeenCalledOnce();
  });
});
