import { AuthError } from "../application/errors";
import type { AuthUser } from "../application/types";
import { requireActiveRequestUser } from "./active-request-user";

export async function requireAdminRequestUser(request: Request): Promise<AuthUser> {
  const user = await requireActiveRequestUser(request);
  assertAdminUser(user);
  return user;
}

export function assertAdminUser(user: AuthUser): void {
  if (user.role !== "admin") {
    throw new AuthError("FORBIDDEN", 403, "Administrator access is required.");
  }
}
