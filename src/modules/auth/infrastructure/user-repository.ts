import type { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { UserModel, type User } from "../../users/infrastructure/user.model";
import { AuthError } from "../application/errors";
import type {
  AuthUser,
  AuthUserRepository,
  CreateAuthUser,
} from "../application/types";

function mapUser(user: User & { _id: Types.ObjectId }): AuthUser {
  return {
    accessExpiresAt: user.accessExpiresAt?.toISOString(),
    authVersion: user.authVersion,
    emailNormalized: user.emailNormalized,
    id: user._id.toString(),
    lifecycleStatus: user.lifecycleStatus,
    name: user.name,
    role: user.role,
    theme: user.theme,
  };
}

export class MongoAuthUserRepository implements AuthUserRepository {
  async create(input: CreateAuthUser): Promise<AuthUser> {
    await connectToMongo();

    try {
      const user = await UserModel.create(input);
      return mapUser(user);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new AuthError(
          "EMAIL_IN_USE",
          409,
          "An account already exists for this email.",
        );
      }
      throw error;
    }
  }

  async findByEmailWithPassword(emailNormalized: string) {
    await connectToMongo();
    const user = await UserModel.findOne({ emailNormalized })
      .select("+passwordHash")
      .exec();

    if (!user) return null;
    return { ...mapUser(user), passwordHash: user.passwordHash };
  }

  async findById(id: string): Promise<AuthUser | null> {
    await connectToMongo();
    const user = await UserModel.findById(id).exec();
    return user ? mapUser(user) : null;
  }

  async recordLogin(id: string): Promise<void> {
    await connectToMongo();
    await UserModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }).exec();
  }
}
