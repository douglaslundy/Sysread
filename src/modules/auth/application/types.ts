export type AuthUser = {
  accessExpiresAt?: string;
  authVersion: number;
  emailNormalized: string;
  id: string;
  lifecycleStatus: "active" | "blocked" | "deleting" | "deleted";
  name: string;
  role: "admin" | "user";
  theme: "system" | "dark" | "light";
};

export type CreateAuthUser = {
  emailNormalized: string;
  name: string;
  passwordHash: string;
};

export interface AuthUserRepository {
  create(input: CreateAuthUser): Promise<AuthUser>;
  findByEmailWithPassword(emailNormalized: string): Promise<
    (AuthUser & { passwordHash?: string }) | null
  >;
  findById(id: string): Promise<AuthUser | null>;
  recordLogin(id: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export type SessionClaims = {
  authVersion: number;
  emailNormalized: string;
  userId: string;
};
