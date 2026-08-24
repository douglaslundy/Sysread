import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { AuthError } from "../application/errors";

export function authErrorResponse(error: unknown, request?: Request): NextResponse {
  if (error instanceof AuthError) {
    return apiError(request, error.code, error.message, error.status);
  }

  return apiError(request, "INTERNAL_ERROR", "The request could not be completed.", 500);
}

export function sessionCookieOptions() {
  const appUrl = process.env.APP_URL;

  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax" as const,
    secure: appUrl ? appUrl.startsWith("https://") : process.env.NODE_ENV === "production",
  };
}
