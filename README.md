# Sysread

Production-oriented PWA for continuous reading, Focus/RSVP, private content imports and AI-assisted simplification.

## Current status

The complete application surface is implemented: account, catalog, secure imports, continuous reading, Focus/RSVP, Magic Reading, Mercado Pago subscriptions, original ambient audio, privacy operations and release tooling. Production launch still requires the external credentials and final product-owner legal copy listed in `docs/release.md`.

## Navigation

- `specs/`: canonical requirements and contracts.
- `prompts/`: phase-specific execution prompts.
- `docs/project-map.md`: minimal context routing.
- `docs/deployment-topologies.md`: VPS, cPanel, Vercel and S3/R2 deployment options.
- `prints/`: original visual evidence; open only when a visual ambiguity remains.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build`.
Browser release testing is documented in docs/testing/e2e.md.

## Administration

Promote an existing account with `npm run admin:promote -- usuario@exemplo.com`. The command is idempotent and does not print credentials. Administrators can access `/admin` to manage users, content, identity/domain, Mercado Pago, OpenAI, alerts and legal documents. Integration secrets are encrypted and are never returned by the API.
