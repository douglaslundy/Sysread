import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { BillingError, createVerifiedCheckout } from "@/modules/billing/application/billing-service";
import { saveCheckout } from "@/modules/billing/infrastructure/billing-repository";
import { configuredBilling, configuredPlanId } from "@/modules/billing/infrastructure/configured-provider";

const bodySchema = z.object({ plan: z.enum(["annual", "weekly"]) }).strict();

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return apiError(request, "INVALID_PLAN", "Choose a valid plan." , 400 );
    }
    const { provider, settings } = await configuredBilling();
    const subscription = await createVerifiedCheckout({
      appUrl: settings.publicUrl,
      payerEmail: user.emailNormalized,
      plan: body.data.plan,
      planId: await configuredPlanId(body.data.plan),
      provider,
      userId: user.id,
    });
    if (!subscription.initPoint) {
      throw new BillingError("PROVIDER_ERROR", 502, "Mercado Pago did not return a checkout URL.");
    }
    await saveCheckout({ plan: body.data.plan, subscription, userId: user.id });
    return NextResponse.json({ checkoutUrl: subscription.initPoint });
  } catch (error) {
    if (error instanceof BillingError) {
      return apiError(request, error.code, error.message , error.status );
    }
    return authErrorResponse(error, request);
  }
}
