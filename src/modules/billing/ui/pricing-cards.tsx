"use client";

import { useState } from "react";
import type { BillingPlan } from "../application/types";

const cards = [
  {
    description: "Seven-day free trial, then one annual payment.",
    label: "Annual",
    plan: "annual" as const,
    price: "$97",
    suffix: "/ year",
  },
  {
    description: "Flexible weekly access with no free trial.",
    label: "Weekly",
    plan: "weekly" as const,
    price: "$4.99",
    suffix: "/ week",
  },
];

export function PricingCards() {
  const [working, setWorking] = useState<BillingPlan | null>(null);
  const [error, setError] = useState("");

  const checkout = async (plan: BillingPlan) => {
    setWorking(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        body: JSON.stringify({ plan }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as { checkoutUrl?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error();
      window.location.assign(body.checkoutUrl);
    } catch {
      setError("Sign in and confirm that billing is available, then try again.");
      setWorking(null);
    }
  };

  return (
    <>
      <div className="pricing-grid">
        {cards.map((card) => (
          <article className="pricing-card" key={card.plan}>
            <p>{card.label}</p>
            <h2>{card.price}<small>{card.suffix}</small></h2>
            <p>{card.description}</p>
            <ul>
              <li>Unlimited reading and Focus mode</li>
              <li>Magic Reading simplification</li>
              <li>Private PDF, EPUB, and article imports</li>
            </ul>
            <button disabled={working !== null} onClick={() => void checkout(card.plan)}>
              {working === card.plan ? "Opening Mercado Pago..." : "Choose " + card.label}
            </button>
          </article>
        ))}
      </div>
      <p aria-live="polite" className="pricing-error" role={error ? "alert" : undefined}>{error}</p>
    </>
  );
}
