import { AuthError } from "../../auth/application/errors";
import type { PasswordHasher } from "../../auth/application/types";
import type {
  Profile,
  ProfileRepository,
  ProfileUpdate,
} from "./types";

export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async get(userId: string): Promise<Profile> {
    const profile = await this.profiles.findById(userId);
    if (!profile || profile.lifecycleStatus !== "active") {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }
    return profile;
  }

  async update(userId: string, input: ProfileUpdate): Promise<Profile> {
    const profile = await this.profiles.updateProfile(userId, input);
    if (!profile || profile.lifecycleStatus !== "active") {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }
    return profile;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Profile> {
    const profile = await this.profiles.findByIdWithPassword(userId);
    if (
      !profile ||
      profile.lifecycleStatus !== "active" ||
      !profile.passwordHash ||
      !(await this.passwords.verify(profile.passwordHash, currentPassword))
    ) {
      throw new AuthError(
        "INVALID_PASSWORD",
        401,
        "The current password is invalid.",
      );
    }

    const passwordHash = await this.passwords.hash(newPassword);
    const updated = await this.profiles.updatePassword(userId, passwordHash);
    if (!updated) {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }
    return updated;
  }

  async requestDeletion(
    userId: string,
    expectedAuthVersion: number,
  ): Promise<Profile> {
    const profile = await this.profiles.requestDeletion(
      userId,
      expectedAuthVersion,
    );
    if (!profile) {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }
    return profile;
  }
}