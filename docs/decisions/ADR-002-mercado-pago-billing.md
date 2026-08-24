# ADR-002: Mercado Pago for recurring billing

- Status: accepted
- Date: 2026-08-17

## Decision

Sysread uses Mercado Pago Subscriptions instead of Stripe. The client sends only `annual` or `weekly`; the server maps that value to a configured `preapproval_plan_id`. Subscription creation uses `/preapproval`, and pause, resume or cancellation uses `/preapproval/{id}`.

There is no Stripe-style Customer Portal in the product contract. Billing management is implemented in the Sysread account UI and executed server-side through the Mercado Pago API.

Notifications must validate `x-signature`, store a stable notification identifier for idempotency, fetch the referenced subscription from Mercado Pago and only then update normalized entitlement. Notification payload status is never trusted as the source of truth.

## Configuration

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_ANNUAL_PLAN_ID`
- `MERCADOPAGO_WEEKLY_PLAN_ID`

## References

- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/overview
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management
- https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks