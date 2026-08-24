import type { AuthUser } from "./types";

export function hasValidAccess(user: AuthUser, now = new Date()): boolean {
  return user.role === "admin" ||
    !user.accessExpiresAt ||
    new Date(user.accessExpiresAt).getTime() > now.getTime();
}
