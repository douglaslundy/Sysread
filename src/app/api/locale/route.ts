import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { shouldUseSecureCookie } from "@/lib/cookie-security";
import { z } from "zod";
import { localeCookieName, locales } from "../../../i18n/config";

const localeSchema = z.object({
  locale: z.enum(locales),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = localeSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(request, "INVALID_LOCALE", "Unsupported locale." , 400 );
  }

  const response = NextResponse.json({ locale: parsed.data.locale });
  response.cookies.set(localeCookieName, parsed.data.locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
  });

  return response;
}
