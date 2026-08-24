import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PrivateObjectStorage } from "../application/types";
import { assertPrivateStorageKey } from "./storage-key";

export type S3PrivateStorageOptions = {
  bucket: string;
  prefix?: string;
};

export class S3PrivateObjectStorage implements PrivateObjectStorage {
  private readonly prefix: string;

  constructor(
    private readonly client: S3Client,
    private readonly options: S3PrivateStorageOptions,
  ) {
    this.prefix = (options.prefix ?? "").replace(/^\/+|\/+$/gu, "");
  }

  private key(storageKey: string) {
    const safeKey = assertPrivateStorageKey(storageKey);
    return this.prefix ? this.prefix + "/" + safeKey : safeKey;
  }

  async get(storageKey: string) {
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(storageKey),
    }));
    if (!result.Body) throw new Error("Private object has no body.");
    return new Uint8Array(await result.Body.transformToByteArray());
  }

  async put(input: {
    bytes: Uint8Array;
    contentType: string;
    storageKey: string;
  }) {
    await this.client.send(new PutObjectCommand({
      Body: input.bytes,
      Bucket: this.options.bucket,
      ContentType: input.contentType,
      Key: this.key(input.storageKey),
      ServerSideEncryption: "AES256",
    }));
  }

  async delete(storageKey: string) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(storageKey),
    }));
  }
}