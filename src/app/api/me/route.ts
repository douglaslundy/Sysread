import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { localeCookieName } from "@/i18n/config";
import { AuthError } from "@/modules/auth/application/errors";
import { argon2PasswordHasher } from "@/modules/auth/infrastructure/password";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { requireRequestSession } from "@/modules/auth/infrastructure/request-session";
import { authCookieName } from "@/modules/auth/infrastructure/session";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { ProfileService } from "@/modules/profile/application/profile-service";
import type { Profile } from "@/modules/profile/application/types";
import { MongoProfileRepository } from "@/modules/profile/infrastructure/profile-repository";
import { profileUpdateSchema } from "@/modules/profile/infrastructure/validation";

function service() {
  return new ProfileService(
    new MongoProfileRepository(),
    argon2PasswordHasher,
  );
}

function publicProfile(profile: Profile) {
  return {
    avatarUrl: profile.avatarUrl,
    email: profile.email,
    id: profile.id,
    locale: profile.locale,
    name: profile.name,
    theme: profile.theme,
  };
}

async function requireActiveProfile(request: Request) {
  const claims = await requireRequestSession(request);
  const profile = await service().get(claims.userId);

  if (profile.authVersion !== claims.authVersion) {
    throw new AuthError("UNAUTHENTICATED", 401, "Authentication is required.");
  }

  return { claims, profile };
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireActiveProfile(request);
    return NextResponse.json({ profile: publicProfile(profile) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request);
    const { claims } = await requireActiveProfile(request);
    const input = profileUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the profile fields.", 400 );
    }

    const profile = await service().update(claims.userId, input.data);
    const response = NextResponse.json({ profile: publicProfile(profile) });

    if (input.data.locale) {
      response.cookies.set(localeCookieName, input.data.locale, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

export async function DELETE(request: Request) {
  try {
    await assertSameOrigin(request);
    const claims = await requireRequestSession(request);
    await service().requestDeletion(claims.userId, claims.authVersion);

    const response = NextResponse.json(
      { status: "deletion_requested" },
      { status: 202 },
    );
    response.cookies.set(authCookieName, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
