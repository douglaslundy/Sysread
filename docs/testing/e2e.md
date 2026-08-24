# Browser release tests

The Playwright suite runs against the production standalone bundle on isolated port 3100. It uses the installed Google Chrome by default and can use another Playwright channel through E2E_BROWSER_CHANNEL.

## Local and CI gate

Run a production build, then run npm run test:e2e. The command prepares the standalone assets automatically.

The public gate runs in desktop and mobile viewports and verifies:

- pricing, privacy, terms, navigation and health;
- WCAG 2.0/2.1 A and AA with axe;
- keyboard focus visibility;
- responsive overflow and library visual composition;
- screenshots stored with each test run;
- DOM, transfer-size and DOMContentLoaded budgets.

The CI workflow runs this gate after the production build and uploads traces, screenshots and the HTML report when it fails.

## Authenticated staging journey

Set E2E_BASE_URL to the staging HTTPS origin and E2E_AUTH_COOKIE to a short-lived readcoach_session value for a disposable staging account. Then run npm run test:e2e.

This enables the reader and Focus journey against the authenticated staging shell. API content is deterministic in that scenario, while authentication and route protection remain real. Never use a production cookie or store the value in a file.

The final release rehearsal must still exercise real Mongo persistence, worker imports, AI simplification and Mercado Pago sandbox checkout/webhooks using the checklist in docs/release.md.