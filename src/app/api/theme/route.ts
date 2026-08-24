import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { shouldUseSecureCookie } from "@/lib/cookie-security";
import { themeCookieName } from "@/lib/theme";

const themeSchema = z.object({ theme: z.enum(["dark", "light"]) });

export async function POST(request: Request) {
  const input = themeSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError(request, "INVALID_THEME", "Unsupported theme.", 400);

  const response = NextResponse.json({ theme: input.data.theme });
  response.cookies.set(themeCookieName, input.data.theme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
  });
  return response;
}
