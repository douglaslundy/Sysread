import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { AuthService } from "@/modules/auth/application/auth-service";
import { argon2PasswordHasher } from "@/modules/auth/infrastructure/password";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { createSessionToken, authCookieName } from "@/modules/auth/infrastructure/session";
import { MongoAuthUserRepository } from "@/modules/auth/infrastructure/user-repository";
import { loginSchema } from "@/modules/auth/infrastructure/validation";
import { consumeRateLimit, rateLimitResponse, requestIp } from "@/modules/security/infrastructure/rate-limit";
import {
  authErrorResponse,
  sessionCookieOptions,
} from "@/modules/auth/infrastructure/http";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const rate = await consumeRateLimit({ identity: requestIp(request), limit: 10, scope: "auth_login", windowMs: 15 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(request, rate.retryAfterSeconds);
    const input = loginSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the login fields.", 400 );
    }

    const service = new AuthService(
      new MongoAuthUserRepository(),
      argon2PasswordHasher,
    );
    const user = await service.login(input.data);
    const token = await createSessionToken({
      authVersion: user.authVersion,
      emailNormalized: user.emailNormalized,
      userId: user.id,
    });
    const response = NextResponse.json({
      user: {
        email: user.emailNormalized,
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
    response.cookies.set(authCookieName, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
