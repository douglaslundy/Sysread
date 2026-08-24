"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

type Subscription = {
  entitled: boolean;
  nextPaymentDate?: string;
  plan: "annual" | "weekly";
  status: "active" | "canceled" | "past_due" | "paused" | "pending";
};

export function BillingPanel() {
  const t = useTranslations("Billing");
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const load = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/billing/subscription");
      const body = await response.json() as { subscription: Subscription | null };
      if (!response.ok) throw new Error();
      setSubscription(body.subscription);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const update = async (action: "cancel" | "pause" | "resume") => {
    setStatus("loading");
    try {
      const response = await fetch("/api/billing/subscription", {
        body: JSON.stringify({ action }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = await response.json() as { subscription: Subscription | null };
      if (!response.ok) throw new Error();
      setSubscription(body.subscription);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  if (subscription === undefined) {
    return <Button onClick={() => void load()} variant="secondary">{t("load")}</Button>;
  }
  if (!subscription) {
    return <div className="billing-panel"><p>{t("none")}</p><a href="/pricing">{t("plans")}</a></div>;
  }
  return (
    <div className="billing-panel">
      <strong>{t("plan", { plan: subscription.plan })}</strong>
      <p>{t("status", { status: subscription.status })}</p>
      {subscription.nextPaymentDate ? <small>{t("next", { date: new Date(subscription.nextPaymentDate).toLocaleDateString() })}</small> : null}
      <div>
        {subscription.status === "active" ? <Button disabled={status === "loading"} onClick={() => void update("pause")} variant="secondary">{t("pause")}</Button> : null}
        {subscription.status === "paused" ? <Button disabled={status === "loading"} onClick={() => void update("resume")} variant="secondary">{t("resume")}</Button> : null}
        {subscription.status !== "canceled" ? <Button disabled={status === "loading"} onClick={() => void update("cancel")} variant="danger">{t("cancel")}</Button> : null}
      </div>
      <span aria-live="polite" role={status === "error" ? "alert" : "status"}>{status === "loading" ? t("loading") : status === "error" ? t("error") : ""}</span>
    </div>
  );
}
