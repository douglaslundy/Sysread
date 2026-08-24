import { cookies } from "next/headers";
import type { AuthUser } from "../application/types";
import { MongoAuthUserRepository } from "./user-repository";
import {
  authCookieName,
  verifySessionToken,
} from "./session";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await new MongoAuthUserRepository().findById(claims.userId);
  if (
    !user ||
    user.lifecycleStatus !== "active" ||
    user.authVersion !== claims.authVersion
  ) {
    return null;
  }

  return user;
}