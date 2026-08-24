import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { AuthError } from "@/modules/auth/application/errors";
import { authErrorResponse, sessionCookieOptions } from "@/modules/auth/infrastructure/http";
import { argon2PasswordHasher } from "@/modules/auth/infrastructure/password";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireRequestSession } from "@/modules/auth/infrastructure/request-session";
import {
  authCookieName,
  createSessionToken,
} from "@/modules/auth/infrastructure/session";
import { ProfileService } from "@/modules/profile/application/profile-service";
import { MongoProfileRepository } from "@/modules/profile/infrastructure/profile-repository";
import { passwordUpdateSchema } from "@/modules/profile/infrastructure/validation";

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request);
    const claims = await requireRequestSession(request);
    const profiles = new MongoProfileRepository();
    const current = await profiles.findById(claims.userId);

    if (
      !current ||
      current.lifecycleStatus !== "active" ||
      current.authVersion !== claims.authVersion
    ) {
      throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
    }

    const input = passwordUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the password fields.", 400 );
    }

    const profile = await new ProfileService(
      profiles,
      argon2PasswordHasher,
    ).changePassword(
      claims.userId,
      input.data.currentPassword,
      input.data.newPassword,
    );
    const token = await createSessionToken({
      authVersion: profile.authVersion,
      emailNormalized: profile.email,
      userId: profile.id,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(authCookieName, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
