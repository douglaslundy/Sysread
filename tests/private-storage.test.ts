import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { getServerEnv } from "../src/lib/env";
import { LocalPrivateObjectStorage } from "../src/modules/imports/infrastructure/local-private-storage";
import { createPrivateObjectStorage } from "../src/modules/imports/infrastructure/private-storage-factory";
import { S3PrivateObjectStorage } from "../src/modules/imports/infrastructure/s3-private-storage";

const validKey = "507f1f77bcf86cd799439011/12345678-1234-1234-1234-123456789abc.pdf";

describe("private object storage", () => {
  it("uses encrypted S3-compatible objects under a private prefix", async () => {
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () => new Uint8Array([1, 2, 3]),
          },
        };
      }
      return {};
    });
    const storage = new S3PrivateObjectStorage(
      { send } as unknown as S3Client,
      { bucket: "private-books", prefix: "/readcoach/" },
    );

    await storage.put({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "application/pdf",
      storageKey: validKey,
    });
    await expect(storage.get(validKey)).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await storage.delete(validKey);

    const put = send.mock.calls[0][0];
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect((put as PutObjectCommand).input).toMatchObject({
      Bucket: "private-books",
      ContentType: "application/pdf",
      Key: "readcoach/" + validKey,
      ServerSideEncryption: "AES256",
    });
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("rejects unsafe keys before contacting the provider", async () => {
    const send = vi.fn();
    const storage = new S3PrivateObjectStorage(
      { send } as unknown as S3Client,
      { bucket: "private-books" },
    );
    await expect(storage.get("../secret.txt")).rejects.toThrow("Invalid storage key");
    expect(send).not.toHaveBeenCalled();
  });

  it("selects local or S3 storage from validated environment", () => {
    const base = {
      APP_URL: "https://read.example",
      AUTH_SECRET: "a-secure-test-secret-with-32-characters",
      MONGODB_URI: "mongodb://localhost:27017/readcoach",
      NODE_ENV: "test",
    };
    expect(createPrivateObjectStorage(getServerEnv(base))).toBeInstanceOf(LocalPrivateObjectStorage);
    expect(createPrivateObjectStorage(getServerEnv({
      ...base,
      CONTENT_STORAGE_BUCKET: "private-books",
      CONTENT_STORAGE_PROVIDER: "s3",
      CONTENT_STORAGE_REGION: "us-east-1",
    }))).toBeInstanceOf(S3PrivateObjectStorage);
  });

  it("requires an S3 bucket and complete explicit credentials", () => {
    const base = {
      AUTH_SECRET: "a-secure-test-secret-with-32-characters",
      MONGODB_URI: "mongodb://localhost:27017/readcoach",
    };
    expect(() => getServerEnv({ ...base, CONTENT_STORAGE_PROVIDER: "s3" }))
      .toThrow("CONTENT_STORAGE_BUCKET");
    expect(() => getServerEnv({
      ...base,
      CONTENT_STORAGE_ACCESS_KEY_ID: "access",
      CONTENT_STORAGE_BUCKET: "private-books",
      CONTENT_STORAGE_PROVIDER: "s3",
    })).toThrow("CONTENT_STORAGE_SECRET_ACCESS_KEY");
  });
});