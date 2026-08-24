# Operations runbook

## Signals

All application events are JSON lines. Route traffic carries `x-correlation-id`. Job events expose `metric=job_event`; dead letters use `level=error`. AI completion logs only model, token count and job ID. Billing webhook logs never contain card, payer email, chapter text or webhook secret.

Set ALERT_WEBHOOK_URL to the production incident destination. ALERT_WEBHOOK_SECRET adds a bearer token and ALERT_WEBHOOK_TIMEOUT_MS controls the bounded delivery timeout. Error-level application events and job dead letters are delivered with sanitized metadata only; failures never interrupt the original request or worker.

Production log retention is 30 days. Alert on:

- any `dead_lettered` import or simplification;
- five `billing_webhook_rejected` events in five minutes;
- three billing reconciliation or provider failures in ten minutes;
- health check failure for two consecutive minutes;
- queue age above five minutes or repeated lease loss;
- abnormal AI token growth compared with the 40,000-token hard request budget.

## Triage

1. Search by correlation ID, job ID or provider subscription ID.
2. Check `/api/health`, Mongo connectivity, worker activity, provider status pages and secret presence.
3. Do not paste private text, tokens, signed headers or uploaded files into tickets.
4. For jobs, inspect stable error code and attempt count; run the worker only after the cause is fixed.
5. For billing, retrieve the subscription from Mercado Pago and reconcile; never edit entitlement directly.
6. Record incident start, impact, mitigation and recovery time.

## Recovery

- Restart web and worker independently.
- Failed idempotent jobs may be requeued through their normal request flow.
- Duplicate Mercado Pago notifications are safe; completed events return immediately, while incomplete events retry reconciliation.
- Restore Mongo from a tested encrypted backup, then run `npm run db:migrate`.
- Roll back using the previous immutable image and repeat the smoke suite.

## Health probes

Use /api/health for process liveness and /api/ready for traffic readiness. The readiness endpoint verifies MongoDB with a bounded timeout, returns 503 plus Retry-After when unavailable, and never exposes connection details. Deployment smoke tests require both probes.

## Scheduled privacy purge

Full-source hosts may schedule npm run privacy:purge. Standalone cPanel and Vercel deployments must call /api/cron/privacy daily with the CRON_SECRET bearer value. Alert on privacy_purge_failed and verify that deleting accounts are not accumulating.
