import { beforeAll, describe, expect, it, vi } from "vitest";
import { decryptSetting, encryptSetting } from "../src/modules/admin/infrastructure/settings-crypto";

beforeAll(() => {
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-thirty-two-characters");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/sysread-test");
});

describe("admin setting encryption", () => {
  it("encrypts secrets with authenticated, randomized ciphertext", () => {
    const first = encryptSetting("sensitive-value");
    const second = encryptSetting("sensitive-value");
    expect(first).not.toContain("sensitive-value");
    expect(first).not.toBe(second);
    expect(decryptSetting(first)).toBe("sensitive-value");
  });

  it("rejects malformed or modified ciphertext", () => {
    const encrypted = encryptSetting("secret");
    expect(decryptSetting(encrypted.slice(0, -2) + "aa")).toBeUndefined();
    expect(decryptSetting("not-encrypted")).toBeUndefined();
  });
});
