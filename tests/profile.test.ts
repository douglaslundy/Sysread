import { describe, expect, it, vi } from "vitest";
import type { PasswordHasher } from "../src/modules/auth/application/types";
import { ProfileService } from "../src/modules/profile/application/profile-service";
import type {
  Profile,
  ProfileRepository,
  ProfileUpdate,
} from "../src/modules/profile/application/types";

class MemoryProfiles implements ProfileRepository {
  profile: Profile & { passwordHash?: string } = {
    authVersion: 0,
    email: "reader@example.com",
    id: "user-id",
    lifecycleStatus: "active",
    locale: "pt-BR",
    name: "Reader",
  passwordHash: "hashed:current-password",
  role: "user",
    theme: "system",
  };

  async findById(id: string) {
    return id === this.profile.id ? this.profile : null;
  }

  async findByIdWithPassword(id: string) {
    return this.findById(id);
  }

  async updateProfile(id: string, update: ProfileUpdate) {
    if (id !== this.profile.id) return null;
    this.profile = { ...this.profile, ...update };
    return this.profile;
  }

  async updatePassword(id: string, passwordHash: string) {
    if (id !== this.profile.id) return null;
    this.profile.passwordHash = passwordHash;
    this.profile.authVersion += 1;
    return this.profile;
  }

  async requestDeletion(id: string, expectedAuthVersion: number) {
    if (id !== this.profile.id) return null;
    if (
      this.profile.lifecycleStatus === "deleting" ||
      this.profile.lifecycleStatus === "deleted"
    ) {
      return this.profile;
    }
    if (this.profile.authVersion !== expectedAuthVersion) return null;
    this.profile.lifecycleStatus = "deleting";
    this.profile.authVersion += 1;
    return this.profile;
  }
}

const passwords: PasswordHasher = {
  hash: vi.fn(async (password) => "hashed:" + password),
  verify: vi.fn(async (hash, password) => hash === "hashed:" + password),
};

describe("profile lifecycle", () => {
  it("updates only profile preferences", async () => {
    const repository = new MemoryProfiles();
    const service = new ProfileService(repository, passwords);

    const profile = await service.update("user-id", {
      locale: "en",
      name: "Updated reader",
      theme: "dark",
    });

    expect(profile).toMatchObject({
      locale: "en",
      name: "Updated reader",
      theme: "dark",
    });
    expect(profile.email).toBe("reader@example.com");
  });

  it("verifies the current password and rotates authVersion", async () => {
    const repository = new MemoryProfiles();
    const service = new ProfileService(repository, passwords);

    await expect(
      service.changePassword(
        "user-id",
        "wrong-password",
        "new-secure-password",
      ),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD", status: 401 });

    const profile = await service.changePassword(
      "user-id",
      "current-password",
      "new-secure-password",
    );
    expect(profile.authVersion).toBe(1);
    expect(repository.profile.passwordHash).toBe(
      "hashed:new-secure-password",
    );
  });

  it("makes deletion retries idempotent while access stays revoked", async () => {
    const repository = new MemoryProfiles();
    const service = new ProfileService(repository, passwords);

    const first = await service.requestDeletion("user-id", 0);
    const retry = await service.requestDeletion("user-id", 0);

    expect(first.lifecycleStatus).toBe("deleting");
    expect(first.authVersion).toBe(1);
    expect(retry).toEqual(first);
    await expect(service.get("user-id")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});
