import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";

const prefix = "v1";

function key() {
  return createHash("sha256").update("sysread:admin-settings:" + getServerEnv().AUTH_SECRET).digest();
}

export function encryptSetting(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [prefix, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSetting(value?: string): string | undefined {
  if (!value) return undefined;
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== prefix || !iv || !tag || !encrypted) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}
