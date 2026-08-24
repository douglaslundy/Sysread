import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/modules/auth/application/auth-service";
import { assertOwnership } from "../src/modules/auth/application/authorization";
import { AuthError } from "../src/modules/auth/application/errors";
import type {
  AuthUser,
  AuthUserRepository,
  CreateAuthUser,
  PasswordHasher,
} from "../src/modules/auth/application/types";
import { argon2PasswordHasher } from "../src/modules/auth/infrastructure/password";
import { assertSameOrigin } from "../src/modules/auth/infrastructure/request-security";
import {
  createSessionToken,
  verifySessionToken,
} from "../src/modules/auth/infrastructure/session";

class MemoryUsers implements AuthUserRepository {
  users: Array<AuthUser & { passwordHash?: string }> = [];

  async create(input: CreateAuthUser): Promise<AuthUser> {
    const user: AuthUser & { passwordHash: string } = {
      authVersion: 0,
      emailNormalized: input.emailNormalized,
      id: String(this.users.length + 1),
      lifecycleStatus: "active",
      name: input.name,
      passwordHash: input.passwordHash,
      role: "user",
      theme: "system",
    };
    this.users.push(user);
    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.users.find((user) => user.emailNormalized === email) ?? null;
  }

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async recordLogin() {}
}

const fakePasswords: PasswordHasher = {
  hash: vi.fn(async (password) => "hashed:" + password),
  verify: vi.fn(async (hash, password) => hash === "hashed:" + password),
};

describe("authentication", () => {
  it("registers normalized accounts and rejects duplicate email", async () => {
    const users = new MemoryUsers();
    const service = new AuthService(users, fakePasswords);

    const created = await service.register({
      email: "  Reader@Example.COM ",
      name: " Reader ",
      password: "a-secure-password",
    });

    expect(created.emailNormalized).toBe("reader@example.com");
    expect(created.name).toBe("Reader");
    await expect(
      service.register({
        email: "reader@example.com",
        name: "Another",
        password: "another-secure-password",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_IN_USE", status: 409 });
  });

  it("uses one generic failure for invalid credentials", async () => {
    const users = new MemoryUsers();
    const service = new AuthService(users, fakePasswords);
    await service.register({
      email: "reader@example.com",
      name: "Reader",
      password: "correct-password",
    });

    await expect(
      service.login({
        email: "reader@example.com",
        password: "incorrect-password",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    await expect(
      service.login({
        email: "missing@example.com",
        password: "incorrect-password",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
  });

  it("hashes passwords with Argon2id", async () => {
    const hash = await argon2PasswordHasher.hash("a-long-test-password");

    expect(hash).toContain("$argon2id$");
    await expect(
      argon2PasswordHasher.verify(hash, "a-long-test-password"),
    ).resolves.toBe(true);
    await expect(
      argon2PasswordHasher.verify(hash, "wrong-password"),
    ).resolves.toBe(false);
  });

  it("signs and verifies session claims without accepting tampering", async () => {
    const secret = "a-test-secret-that-is-longer-than-32-characters";
    const claims = {
      authVersion: 2,
      emailNormalized: "reader@example.com",
      userId: "user-id",
    };
    const token = await createSessionToken(claims, secret);

    await expect(verifySessionToken(token, secret)).resolves.toEqual(claims);
    await expect(
      verifySessionToken(token + "tampered", secret),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, "another-secret-that-is-longer-than-32"),
    ).resolves.toBeNull();
  });

  it("requires same-origin mutations", async () => {
    await expect(
      assertSameOrigin(
        new Request("https://app.example/api/auth/login", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).rejects.toBeInstanceOf(AuthError);

    await expect(
      assertSameOrigin(
        new Request("https://app.example/api/auth/login", {
          headers: { origin: "https://app.example" },
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("uses the public application origin behind a reverse proxy", async () => {
    vi.stubEnv("APP_URL", "https://reader.example");

    try {
      await expect(
        assertSameOrigin(
          new Request("http://web:3000/api/auth/login", {
            headers: { origin: "https://reader.example" },
          }),
        ),
      ).resolves.toBeUndefined();
      await expect(
        assertSameOrigin(
          new Request("http://web:3000/api/auth/login", {
            headers: { origin: "http://web:3000" },
          }),
        ),
      ).rejects.toBeInstanceOf(AuthError);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("enforces ownership and distinguishes authentication failures", () => {
    expect(() => assertOwnership("owner-a", undefined)).toThrowError(
      expect.objectContaining({ code: "UNAUTHENTICATED", status: 401 }),
    );
    expect(() => assertOwnership("owner-a", "owner-b")).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN", status: 403 }),
    );
    expect(() => assertOwnership("owner-a", "owner-a")).not.toThrow();
  });
});
