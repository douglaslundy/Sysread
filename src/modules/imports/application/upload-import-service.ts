import { createHash, randomUUID } from "node:crypto";
import type {
  ImportRepository,
  PrivateObjectStorage,
  UploadedImport,
  UploadKind,
} from "./types";

export class UploadValidationError extends Error {
  constructor(
    readonly code: "FILE_TOO_LARGE" | "INVALID_FILE" | "QUOTA_EXCEEDED" | "STORAGE_UNAVAILABLE",
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function detectUploadKind(bytes: Uint8Array): UploadKind | null {
  const pdfHeader = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (pdfHeader === "%PDF-") return "pdf";

  const mobiHeader = new TextDecoder("ascii").decode(bytes.slice(60, 68));
  if (mobiHeader === "BOOKMOBI") return "mobi";

  if (
    bytes.length >= 58 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const compression = view.getUint16(8, true);
    const fileNameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const fileNameStart = 30;
    const contentStart = fileNameStart + fileNameLength + extraLength;
    const fileName = new TextDecoder("ascii").decode(
      bytes.slice(fileNameStart, fileNameStart + fileNameLength),
    );
    const mime = new TextDecoder("ascii").decode(
      bytes.slice(contentStart, contentStart + 20),
    );

    if (
      compression === 0 &&
      fileName === "mimetype" &&
      mime === "application/epub+zip"
    ) {
      return "epub";
    }
  }

  return null;
}

function safeTitle(fileName: string, kind: UploadKind): string {
  const withoutExtension = fileName.replace(/\.(pdf|epub|mobi)$/iu, "").trim();
  const cleaned = withoutExtension.replace(/[\u0000-\u001f\u007f]/gu, "");
  return cleaned.slice(0, 500) || `Imported ${kind.toUpperCase()}`;
}

export class UploadImportService {
  constructor(
    private readonly repository: ImportRepository,
    private readonly storage: PrivateObjectStorage,
    private readonly limits: { maxFileBytes: number; quotaBytes: number },
  ) {}

  async create(input: {
    bytes: Uint8Array;
    contentOnly?: boolean;
    fileName: string;
    ownerId: string;
    publicationRequested?: boolean;
    requesterRole?: "admin" | "user";
  }): Promise<UploadedImport> {
    if (input.bytes.length === 0) {
      throw new UploadValidationError("INVALID_FILE", 415, "The file is empty.");
    }
    if (input.bytes.length > this.limits.maxFileBytes) {
      throw new UploadValidationError(
        "FILE_TOO_LARGE",
        413,
        "The file exceeds the upload limit.",
      );
    }

    const kind = detectUploadKind(input.bytes);
    if (!kind) {
      throw new UploadValidationError(
        "INVALID_FILE",
        415,
        "Only valid PDF, EPUB or MOBI files are accepted.",
      );
    }

    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const contentOnly = input.contentOnly === true;
    const publicationRequested = input.publicationRequested === true;
    const idempotencyKey = `upload:${input.ownerId}:${sha256}:${contentOnly ? "content-only" : "complete"}:${publicationRequested ? "public" : "private"}`;
    const existing = await this.repository.findByIdempotencyKey(
      input.ownerId,
      idempotencyKey,
    );
    if (existing) return existing;

    const reserved = await this.repository.reserveQuota(
      input.ownerId,
      input.bytes.length,
      this.limits.quotaBytes,
    );
    if (!reserved) {
      throw new UploadValidationError(
        "QUOTA_EXCEEDED",
        413,
        "The private storage quota would be exceeded.",
      );
    }

    const storageKey = `${input.ownerId}/${randomUUID()}.${kind}`;
    let stored = false;
    let quotaReserved = true;
    try {
      try {
        await this.storage.put({
          bytes: input.bytes,
          contentType: {
            epub: "application/epub+zip",
            mobi: "application/x-mobipocket-ebook",
            pdf: "application/pdf",
          }[kind],
          storageKey,
        });
      } catch {
        throw new UploadValidationError(
          "STORAGE_UNAVAILABLE",
          503,
          "Private upload storage is temporarily unavailable.",
        );
      }
      stored = true;
      const result = await this.repository.create({
        byteSize: input.bytes.length,
        contentOnly,
        idempotencyKey,
        kind,
        ownerId: input.ownerId,
        publicationRequested,
        requesterRole: input.requesterRole ?? "user",
        sha256,
        storageKey,
        title: safeTitle(input.fileName, kind),
      });

      if (!result.created) {
        await this.storage.delete(storageKey);
        stored = false;
        await this.repository.releaseQuota(input.ownerId, input.bytes.length);
        quotaReserved = false;
      }
      return { contentId: result.contentId, jobId: result.jobId };
    } catch (error) {
      if (stored) await this.storage.delete(storageKey).catch(() => undefined);
      if (quotaReserved) {
        await this.repository
          .releaseQuota(input.ownerId, input.bytes.length)
          .catch(() => undefined);
      }
      throw error;
    }
  }
}

export const uploadFileInternals = { detectUploadKind, safeTitle };
