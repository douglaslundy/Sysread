# Release and rollback

## Required external decisions

Bootstrap requires a strong `AUTH_SECRET`, MongoDB, private storage and backups. After the first administrator is promoted, complete the five readiness groups in `/admin/settings`: HTTPS domain, Mercado Pago, OpenAI, alerts and final legal documents. Provider accounts, DNS and TLS termination still need to exist externally, but their application parameters are managed in the platform.

## Preview and staging

Set RELEASE_STAGE=staging, DEPLOY_TARGET to persistent, split or vercel, and BACKGROUND_EXECUTION to worker or http-cron. Run npm run release:check:staging before migrations. Environment variables remain supported as recovery fallbacks; normal integration configuration is performed by the administrator.

1. Create an immutable image from the reviewed revision.
2. Configure separate Mongo and storage, then save OpenAI and Mercado Pago sandbox credentials in `/admin/settings`.
3. Run `npm run release:check`, `npm run db:migrate`, `npm run seed:summaries`, and start web plus worker.
4. Run `APP_URL=https://staging.example npm run smoke`.
5. Exercise registration, PDF/EPUB/URL import, resume, Focus, Magic Reading, Mercado Pago sandbox checkout/webhook, pause/cancel, export and deletion.
6. Verify accessibility keyboard paths, 360/768/1440 px layouts, structured alerts and backup restore.

## Production

Set RELEASE_STAGE=production and the final DEPLOY_TARGET, run the bootstrap check, and confirm that all five readiness indicators in `/admin/settings` are complete.

Promote the exact staging image. Apply indexes before traffic, start one worker, then web instances. Configure Mercado Pago `subscription_preapproval` notifications at `/api/webhooks/mercadopago`. Confirm `/api/health` and `/api/ready`, run smoke tests, inspect alerts and queue age, then enable traffic gradually.

## Rollback

Stop traffic growth, retain evidence without private content, deploy the previous image, and do not reverse a schema operation until its compatibility is verified. This release only adds backward-compatible collections/fields and indexes, so the prior application can ignore them. Reconcile Mercado Pago after rollback and replay only idempotent jobs. Record the incident and validate export/deletion schedules.
## Local verification

Verified on 2026-08-17: TypeScript, ESLint, production build, 144 automated Vitest tests across 49 files, 12 Playwright browser checks across desktop and mobile, WCAG AA scans, dependency audit, public-page smoke checks, responsive visual captures, performance budgets, API error contracts, charset integrity and absence of active Stripe references all passed. The workspace is not a Git repository, so the mandatory git diff check cannot run here.

Remaining release gates require external state: the product owner's final legal copy and identity values; a monitoring/alert destination; staging and Mercado Pago sandbox test accounts; production secrets, Mongo, encrypted storage/backups, TLS domain and a deployment target. Docker is not installed in this environment.
