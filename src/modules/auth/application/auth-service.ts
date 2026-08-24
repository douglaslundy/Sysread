import { AuthError } from "./errors";
import type {
  AuthUser,
  AuthUserRepository,
  PasswordHasher,
} from "./types";

type RegisterInput = {
  email: string;
  name: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export class AuthService {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async register(input: RegisterInput): Promise<AuthUser> {
    const emailNormalized = normalizeEmail(input.email);
    const existing = await this.users.findByEmailWithPassword(emailNormalized);

    if (existing) {
      throw new AuthError(
        "EMAIL_IN_USE",
        409,
        "An account already exists for this email.",
      );
    }

    const passwordHash = await this.passwords.hash(input.password);
    return this.users.create({
      emailNormalized,
      name: input.name.trim(),
      passwordHash,
    });
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const emailNormalized = normalizeEmail(input.email);
    const user = await this.users.findByEmailWithPassword(emailNormalized);

    if (
      !user ||
      !user.passwordHash ||
      !(await this.passwords.verify(user.passwordHash, input.password))
    ) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        401,
        "Email or password is invalid.",
      );
    }

    if (user.lifecycleStatus !== "active") {
      throw new AuthError("USER_INACTIVE", 403, "This account is not active.");
    }

    await this.users.recordLogin(user.id);

    return toPublicUser(user);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicUser(user: AuthUser): AuthUser {
  return {
    accessExpiresAt: user.accessExpiresAt,
    authVersion: user.authVersion,
    emailNormalized: user.emailNormalized,
    id: user.id,
    lifecycleStatus: user.lifecycleStatus,
    name: user.name,
    role: user.role,
    theme: user.theme,
  };
}
