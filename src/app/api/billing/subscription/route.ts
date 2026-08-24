import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { BillingError, hasEntitlement } from "@/modules/billing/application/billing-service";
import { findSubscription, reconcileSubscription } from "@/modules/billing/infrastructure/billing-repository";
import { configuredBilling } from "@/modules/billing/infrastructure/configured-provider";

function view(subscription: Awaited<ReturnType<typeof findSubscription>>) {
  if (!subscription) return null;
  return {
    entitled: hasEntitlement(subscription.normalizedStatus, subscription.nextPaymentDate?.toISOString()),
    nextPaymentDate: subscription.nextPaymentDate?.toISOString(),
    plan: subscription.plan,
    status: subscription.normalizedStatus,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    return NextResponse.json({ subscription: view(await findSubscription(user.id)) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

const bodySchema = z.object({ action: z.enum(["cancel", "pause", "resume"]) }).strict();

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return apiError(request, "INVALID_ACTION", "Choose a valid billing action." , 400 );
    }
    const current = await findSubscription(user.id);
    if (!current) {
      return apiError(request, "SUBSCRIPTION_NOT_FOUND", "Subscription not found." , 404 );
    }
    const { provider } = await configuredBilling();
    const providerStatus = body.data.action === "cancel" ? "canceled" : body.data.action === "pause" ? "paused" : "authorized";
    const updated = await provider.updateSubscription(current.providerSubscriptionId, providerStatus);
    const reconciled = await reconcileSubscription({ subscription: updated });
    return NextResponse.json({ subscription: view(reconciled) });
  } catch (error) {
    if (error instanceof BillingError) {
      return apiError(request, error.code, error.message , error.status );
    }
    return authErrorResponse(error, request);
  }
}
