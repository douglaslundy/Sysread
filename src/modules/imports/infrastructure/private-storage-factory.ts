import { S3Client } from "@aws-sdk/client-s3";
import type { ServerEnv } from "@/lib/env";
import type { PrivateObjectStorage } from "../application/types";
import { LocalPrivateObjectStorage } from "./local-private-storage";
import { S3PrivateObjectStorage } from "./s3-private-storage";

type StorageEnvironment = Pick<
  ServerEnv,
  | "CONTENT_STORAGE_ACCESS_KEY_ID"
  | "CONTENT_STORAGE_BUCKET"
  | "CONTENT_STORAGE_DIR"
  | "CONTENT_STORAGE_ENDPOINT"
  | "CONTENT_STORAGE_FORCE_PATH_STYLE"
  | "CONTENT_STORAGE_PREFIX"
  | "CONTENT_STORAGE_PROVIDER"
  | "CONTENT_STORAGE_REGION"
  | "CONTENT_STORAGE_SECRET_ACCESS_KEY"
>;

export function createPrivateObjectStorage(env: StorageEnvironment): PrivateObjectStorage {
  if (env.CONTENT_STORAGE_PROVIDER === "local") {
    return new LocalPrivateObjectStorage(env.CONTENT_STORAGE_DIR);
  }

  if (!env.CONTENT_STORAGE_BUCKET) {
    throw new Error("S3 private storage requires CONTENT_STORAGE_BUCKET.");
  }

  const hasCredentials = Boolean(
    env.CONTENT_STORAGE_ACCESS_KEY_ID && env.CONTENT_STORAGE_SECRET_ACCESS_KEY,
  );
  const client = new S3Client({
    credentials: hasCredentials ? {
      accessKeyId: env.CONTENT_STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: env.CONTENT_STORAGE_SECRET_ACCESS_KEY!,
    } : undefined,
    endpoint: env.CONTENT_STORAGE_ENDPOINT,
    forcePathStyle: env.CONTENT_STORAGE_FORCE_PATH_STYLE,
    region: env.CONTENT_STORAGE_REGION,
  });
  return new S3PrivateObjectStorage(client, {
    bucket: env.CONTENT_STORAGE_BUCKET,
    prefix: env.CONTENT_STORAGE_PREFIX,
  });
}