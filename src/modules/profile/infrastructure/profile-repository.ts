import type { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { AuthError } from "../../auth/application/errors";
import { UserModel, type User } from "../../users/infrastructure/user.model";
import type {
  Profile,
  ProfileRepository,
  ProfileUpdate,
} from "../application/types";

function mapProfile(user: User & { _id: Types.ObjectId }): Profile {
  return {
    accessExpiresAt: user.accessExpiresAt?.toISOString(),
    authVersion: user.authVersion,
    avatarUrl: user.avatarUrl,
    email: user.emailNormalized,
    id: user._id.toString(),
    lifecycleStatus: user.lifecycleStatus,
    locale: user.locale,
    name: user.name,
    role: user.role,
    theme: user.theme,
  };
}

export class MongoProfileRepository implements ProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    await connectToMongo();
    const user = await UserModel.findById(id).exec();
    return user ? mapProfile(user) : null;
  }

  async findByIdWithPassword(id: string) {
    await connectToMongo();
    const user = await UserModel.findById(id).select("+passwordHash").exec();
    return user
      ? { ...mapProfile(user), passwordHash: user.passwordHash }
      : null;
  }

  async updateProfile(
    id: string,
    update: ProfileUpdate,
  ): Promise<Profile | null> {
    await connectToMongo();
    const allowedUpdate: ProfileUpdate = {};

    if (update.avatarUrl !== undefined) allowedUpdate.avatarUrl = update.avatarUrl;
    if (update.locale !== undefined) allowedUpdate.locale = update.locale;
    if (update.name !== undefined) allowedUpdate.name = update.name;
    if (update.theme !== undefined) allowedUpdate.theme = update.theme;

    const user = await UserModel.findOneAndUpdate(
      { _id: id, lifecycleStatus: "active" },
      { $set: allowedUpdate },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return user ? mapProfile(user) : null;
  }

  async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<Profile | null> {
    await connectToMongo();
    const user = await UserModel.findOneAndUpdate(
      { _id: id, lifecycleStatus: "active" },
      {
        $inc: { authVersion: 1 },
        $set: { passwordHash },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return user ? mapProfile(user) : null;
  }

  async requestDeletion(
    id: string,
    expectedAuthVersion: number,
  ): Promise<Profile | null> {
    await connectToMongo();
    const existing = await UserModel.findById(id).exec();
    if (!existing) return null;

    if (
      existing.lifecycleStatus === "deleting" ||
      existing.lifecycleStatus === "deleted"
    ) {
      return mapProfile(existing);
    }

    if (existing.authVersion !== expectedAuthVersion) {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }

    const user = await UserModel.findOneAndUpdate(
      {
        _id: id,
        authVersion: expectedAuthVersion,
        lifecycleStatus: "active",
      },
      {
        $inc: { authVersion: 1 },
        $set: { lifecycleStatus: "deleting" },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();

    return user ? mapProfile(user) : null;
  }
}
