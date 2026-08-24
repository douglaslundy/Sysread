import { describe, expect, it } from "vitest";
import { hasValidAccess } from "../src/modules/auth/application/access";
import type { AuthUser } from "../src/modules/auth/application/types";
import { assertAdminUser } from "../src/modules/auth/infrastructure/admin-request-user";

const user = (update: Partial<AuthUser> = {}): AuthUser => ({
  authVersion: 0, emailNormalized: "user@example.com", id: "user-id",
  lifecycleStatus: "active", name: "User", role: "user", theme: "system", ...update,
});

describe("administrative authorization and access validity", () => {
  it("rejects common users and accepts administrators", () => {
    expect(() => assertAdminUser(user())).toThrow(expect.objectContaining({ code: "FORBIDDEN", status: 403 }));
    expect(() => assertAdminUser(user({ role: "admin" }))).not.toThrow();
  });

  it("honors expiration while preserving administrator recovery access", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    expect(hasValidAccess(user({ accessExpiresAt: "2026-08-18T11:00:00.000Z" }), now)).toBe(false);
    expect(hasValidAccess(user({ accessExpiresAt: "2026-08-18T13:00:00.000Z" }), now)).toBe(true);
    expect(hasValidAccess(user({ accessExpiresAt: "2020-01-01T00:00:00.000Z", role: "admin" }), now)).toBe(true);
  });
});
