import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getAdminSettings, updatePlatformSettings } from "@/modules/admin/application/platform-settings";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";

const optionalSecret = z.string().max(4000).optional();
const schema = z.object({
  ai: z.object({ apiKey: optionalSecret, clearApiKey: z.boolean().optional(), model: z.string().trim().min(1).max(120), provider: z.literal("openai") }).strict(),
  alerts: z.object({ clearSecret: z.boolean().optional(), secret: optionalSecret, timeoutMs: z.number().int().min(1000).max(30000), url: z.union([z.literal(""), z.string().url().max(2048)]) }).strict(),
  legal: z.object({
    effectiveDate: z.string().trim().min(1).max(80), governingLaw: z.string().trim().min(2).max(240), operatorName: z.string().trim().min(2).max(240),
    privacyEmail: z.string().trim().email().max(320), privacyText: z.string().max(50000), supportEmail: z.string().trim().email().max(320),
    termsText: z.string().max(50000), venue: z.string().trim().min(2).max(240),
  }).strict(),
  mercadoPago: z.object({ accessToken: optionalSecret, annualPlanId: z.string().trim().max(240), clearAccessToken: z.boolean().optional(), clearWebhookSecret: z.boolean().optional(), webhookSecret: optionalSecret, weeklyPlanId: z.string().trim().max(240) }).strict(),
  platformName: z.string().trim().min(2).max(80), publicUrl: z.string().url().max(2048), tlsMode: z.enum(["external", "disabled"]),
}).strict();

export async function GET(request: Request) {
  try { await requireAdminRequestUser(request); return NextResponse.json({ settings: await getAdminSettings() }); }
  catch (error) { return authErrorResponse(error, request); }
}

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request); await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Revise os campos de configuração.", 400);
    return NextResponse.json({ settings: await updatePlatformSettings(input.data) });
  } catch (error) { return authErrorResponse(error, request); }
}
