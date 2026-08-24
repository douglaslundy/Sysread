import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getRuntimeSettings } from "@/modules/admin/application/platform-settings";
import { connectToMongo } from "@/lib/db/mongodb";
import { correlationId, logEvent } from "@/lib/observability";
import { reconcileSubscription } from "@/modules/billing/infrastructure/billing-repository";
import { MercadoPagoBillingProvider } from "@/modules/billing/infrastructure/mercadopago-provider";
import { BillingWebhookEventModel } from "@/modules/billing/infrastructure/webhook-event.model";
import { validateMercadoPagoSignature } from "@/modules/billing/infrastructure/webhook-signature";

export async function POST(request: Request) {
  const settings = await getRuntimeSettings();
  const requestCorrelationId = correlationId(request);
  if (!settings.mercadoPago.accessToken || !settings.mercadoPago.webhookSecret) {
    return apiError(request, "BILLING_NOT_CONFIGURED", "Billing is temporarily unavailable.", 503);
  }
  const url = new URL(request.url);
  const body = await request.json().catch(() => null) as { data?: { id?: string }; type?: string } | null;
  const dataId = url.searchParams.get("data.id") ?? body?.data?.id ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const signature = request.headers.get("x-signature") ?? "";
  const checked = validateMercadoPagoSignature({
    dataId,
    requestId,
    secret: settings.mercadoPago.webhookSecret,
    signature,
  });
  if (!dataId || !requestId || !checked.valid) {
    logEvent({ correlationId: requestCorrelationId, event: "billing_webhook_rejected", level: "warn" });
    return apiError(request, "INVALID_SIGNATURE", "Invalid webhook signature.", 401);
  }
  const topic = url.searchParams.get("type") ?? body?.type ?? "";
  if (topic !== "subscription_preapproval") return NextResponse.json({ received: true });

  const eventKey = requestId + ":" + checked.timestamp + ":" + dataId;
  await connectToMongo();
  try {
    await BillingWebhookEventModel.create({
      eventKey,
      providerResourceId: dataId,
      providerTimestamp: checked.timestamp,
      topic,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await BillingWebhookEventModel.findOne({ eventKey }).lean().exec();
    if (existing?.reconciledAt) return NextResponse.json({ received: true });
  }

  try {
    const provider = new MercadoPagoBillingProvider(settings.mercadoPago.accessToken);
    const subscription = await provider.getSubscription(dataId);
    const reconciled = await reconcileSubscription({ lastNotificationId: eventKey, subscription });
    await BillingWebhookEventModel.updateOne(
      { eventKey },
      { $set: { reconciledAt: new Date() } },
    ).exec();
    logEvent({ correlationId: requestCorrelationId, event: "billing_webhook_reconciled", fields: { reconciled: Boolean(reconciled) } });
    return NextResponse.json({ received: true, reconciled: Boolean(reconciled) });
  } catch (error) {
    logEvent({
      correlationId: requestCorrelationId,
      event: "billing_webhook_reconcile_failed",
      fields: { errorType: error instanceof Error ? error.name : "unknown" },
      level: "error",
    });
    return apiError(request, "PROVIDER_ERROR", "The subscription could not be reconciled.", 502);
  }
}
