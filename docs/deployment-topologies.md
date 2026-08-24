# Deployment topologies

Sysread can run on a persistent Node.js host, entirely on Vercel, or as a split deployment.

## Single persistent host

Use a VPS, Docker host, or cPanel account with Node.js 22 and Passenger.

- Run the Next.js standalone server.
- Use MongoDB Atlas or another reachable MongoDB deployment.
- Set CONTENT_STORAGE_PROVIDER=local and CONTENT_STORAGE_DIR to a private persistent directory outside the public web root.
- Run npm run jobs:work as a supervised process, or npm run jobs:work -- --once from cron.
- Run npm run privacy:purge on a separate schedule.

The web process and worker must see the same filesystem.

The included Docker Compose stack mounts the private uploads-data volume into both web and worker containers. It also waits for MongoDB health and probes /api/ready before treating the web container as ready.

### cPanel package

For a standalone-only upload, set BACKGROUND_EXECUTION=http-cron and configure CRON_SECRET. Schedule an authenticated GET to /api/cron/jobs every minute and /api/cron/privacy daily. Both endpoints require Authorization: Bearer CRON_SECRET, use constant-time verification, return cache-free JSON and emit safe operational logs. This mode does not require TypeScript source or tsx on the host.

Run npm run deploy:cpanel:prepare. Upload the contents of .next/standalone as the private Node application directory and select app.js as the Passenger startup file. Configure the domain in Application Manager. Do not place CONTENT_STORAGE_DIR inside public_html.

The hosting plan must expose Application Manager, Node.js 22, Passenger, SSH/npm, cron jobs, outbound HTTPS and enough memory for Next.js plus PDF/EPUB parsing. Shared-host resource limits may require moving the worker to a VPS.

## Vercel deployment

The included vercel.json invokes /api/cron/jobs every minute and /api/cron/privacy daily. The endpoint:

- validates the Vercel Authorization bearer value against CRON_SECRET using constant-time comparison;
- processes no more than three leased jobs per invocation;
- uses Mongo leases and idempotency to tolerate overlap;
- emits structured metrics and operational alerts;
- never returns internal errors or secrets.

Configure CRON_SECRET in Vercel. The once-per-minute schedule requires a Vercel plan that supports that frequency. Configure CONTENT_STORAGE_PROVIDER=s3 because Vercel local writes are not persistent.

## Split Vercel and persistent worker deployment

You may disable the Vercel cron and run npm run jobs:work on cPanel or a VPS instead. Both environments must use:

- the same MongoDB deployment;
- CONTENT_STORAGE_PROVIDER=s3;
- the same bucket, region, endpoint, prefix and credentials.

S3-compatible providers such as AWS S3 and Cloudflare R2 are supported. For R2, use its S3 endpoint and region auto.

## S3-compatible environment

CONTENT_STORAGE_PROVIDER=s3
CONTENT_STORAGE_BUCKET=private-bucket
CONTENT_STORAGE_REGION=auto
CONTENT_STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
CONTENT_STORAGE_ACCESS_KEY_ID=...
CONTENT_STORAGE_SECRET_ACCESS_KEY=...
CONTENT_STORAGE_PREFIX=readcoach
CONTENT_STORAGE_FORCE_PATH_STYLE=false

AWS workloads using an instance role may omit the explicit access key and secret. Uploaded objects use private keys and request AES-256 server-side encryption. Bucket public access must remain disabled.

## Operational environment

CRON_SECRET=long-random-value
ALERT_WEBHOOK_URL=https://monitoring.example/hooks/readcoach
ALERT_WEBHOOK_SECRET=optional-bearer-secret
ALERT_WEBHOOK_TIMEOUT_MS=5000

Use separate credentials and buckets for staging and production.
## Release profiles

Set DEPLOY_TARGET=persistent for a single cPanel, VPS or Docker host; DEPLOY_TARGET=vercel for the all-Vercel topology; or DEPLOY_TARGET=split for Vercel plus a persistent worker. The preflight requires S3-compatible private storage for vercel and split, and requires CRON_SECRET for vercel.
