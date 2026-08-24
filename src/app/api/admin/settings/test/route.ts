import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { sendOperationalAlert } from "@/lib/alerts";
import { getRuntimeSettings } from "@/modules/admin/application/platform-settings";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";

const schema = z.object({ target: z.enum(["ai", "alerts", "mercadopago"]) }).strict();

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Selecione uma integração válida.", 400);
    const settings = await getRuntimeSettings();
    if (input.data.target === "alerts") {
      if (!settings.alerts.url) return apiError(request, "NOT_CONFIGURED", "Configure a URL de alertas primeiro.", 409);
      const result = await sendOperationalAlert({ event: "admin_configuration_test", fields: { source: "settings" } }, settings.alerts);
      return result === "delivered" ? NextResponse.json({ ok: true }) : apiError(request, "CONNECTION_FAILED", "O webhook de alertas não confirmou o recebimento.", 502);
    }
    const isAi = input.data.target === "ai";
    const token = isAi ? settings.ai.apiKey : settings.mercadoPago.accessToken;
    if (!token) return apiError(request, "NOT_CONFIGURED", "Configure a credencial primeiro.", 409);
    const url = isAi ? `https://api.openai.com/v1/models/${encodeURIComponent(settings.ai.model)}` : "https://api.mercadopago.com/users/me";
    const response = await fetch(url, { headers: { authorization: "Bearer " + token }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return apiError(request, "CONNECTION_FAILED", "A credencial ou configuração não foi aceita pelo provedor.", 502);
    return NextResponse.json({ ok: true });
  } catch (error) { return authErrorResponse(error, request); }
}
