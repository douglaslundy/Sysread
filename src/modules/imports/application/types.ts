export type UploadKind = "pdf" | "epub" | "mobi";

export interface UploadedImport {
  contentId: string;
  jobId: string;
}

export interface CreateImportRecord {
  byteSize: number;
  contentOnly: boolean;
  idempotencyKey: string;
  kind: UploadKind;
  ownerId: string;
  publicationRequested: boolean;
  requesterRole: "admin" | "user";
  sha256: string;
  storageKey: string;
  title: string;
}

export interface ImportRepository {
  create(input: CreateImportRecord): Promise<UploadedImport & { created: boolean }>;
  findByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<UploadedImport | null>;
  releaseQuota(ownerId: string, bytes: number): Promise<void>;
  reserveQuota(ownerId: string, bytes: number, limit: number): Promise<boolean>;
}

export interface PrivateObjectStorage {
  get(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  put(input: {
    bytes: Uint8Array;
    contentType: string;
    storageKey: string;
  }): Promise<void>;
}
