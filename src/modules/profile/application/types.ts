export type Profile = {
  accessExpiresAt?: string;
  authVersion: number;
  avatarUrl?: string;
  email: string;
  id: string;
  lifecycleStatus: "active" | "blocked" | "deleting" | "deleted";
  locale: "pt-BR" | "en";
  name: string;
  role: "admin" | "user";
  theme: "system" | "dark" | "light";
};

export type ProfileUpdate = Partial<
  Pick<Profile, "avatarUrl" | "locale" | "name" | "theme">
>;

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  findByIdWithPassword(
    id: string,
  ): Promise<(Profile & { passwordHash?: string }) | null>;
  requestDeletion(id: string, expectedAuthVersion: number): Promise<Profile | null>;
  updatePassword(id: string, passwordHash: string): Promise<Profile | null>;
  updateProfile(id: string, update: ProfileUpdate): Promise<Profile | null>;
}
