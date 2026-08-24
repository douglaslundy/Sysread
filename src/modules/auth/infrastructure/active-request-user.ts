import { AuthError } from "../application/errors";
import { hasValidAccess } from "../application/access";
import type { AuthUser } from "../application/types";
import { requireRequestSession } from "./request-session";
import { MongoAuthUserRepository } from "./user-repository";

export async function requireActiveRequestUser(
  request: Request,
): Promise<AuthUser> {
  const claims = await requireRequestSession(request);
  const user = await new MongoAuthUserRepository().findById(claims.userId);

  if (
    !user ||
    user.lifecycleStatus !== "active" ||
    user.authVersion !== claims.authVersion
  ) {
    throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
  }

  if (!hasValidAccess(user)) {
    throw new AuthError("ACCESS_EXPIRED", 403, "Your access has expired.");
  }

  return user;
}
