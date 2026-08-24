import { NextResponse } from "next/server";
import {
  authErrorResponse,
  sessionCookieOptions,
} from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { authCookieName } from "@/modules/auth/infrastructure/session";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const response = NextResponse.json({ success: true });
    response.cookies.set(authCookieName, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
