import { jwtVerify, SignJWT } from "jose";
import { getServerEnv } from "../../../lib/env";
import type { SessionClaims } from "../application/types";

export const authCookieName = "readcoach_session";
export const sessionTtlSeconds = 60 * 60 * 24 * 30;

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  claims: SessionClaims,
  secret = getServerEnv().AUTH_SECRET,
): Promise<string> {
  return new SignJWT({
    authVersion: claims.authVersion,
    emailNormalized: claims.emailNormalized,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setAudience("readcoach-app")
    .setIssuer("readcoach")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + sessionTtlSeconds)
    .sign(secretKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret = getServerEnv().AUTH_SECRET,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      audience: "readcoach-app",
      issuer: "readcoach",
    });

    if (
      !payload.sub ||
      typeof payload.authVersion !== "number" ||
      typeof payload.emailNormalized !== "string"
    ) {
      return null;
    }

    return {
      authVersion: payload.authVersion,
      emailNormalized: payload.emailNormalized,
      userId: payload.sub,
    };
  } catch {
    return null;
  }
}