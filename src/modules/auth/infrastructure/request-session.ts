import { AuthError } from "../application/errors";
import type { SessionClaims } from "../application/types";
import {
  authCookieName,
  verifySessionToken,
} from "./session";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;

  for (const item of header.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }

  return null;
}

export async function requireRequestSession(
  request: Request,
): Promise<SessionClaims> {
  const token = readCookie(request.headers.get("cookie"), authCookieName);
  const claims = token ? await verifySessionToken(token) : null;

  if (!claims) {
    throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
  }

  return claims;
}