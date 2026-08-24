#!/usr/bin/env bash
set -euo pipefail

app_dir="$HOME/readcoach-test"
archive="$HOME/readcoach-deploy.tar.gz"

mkdir -p "$app_dir"
tar -xzf "$archive" -C "$app_dir"
cd "$app_dir"

if [[ ! -f .env ]]; then
  auth_secret="$(openssl rand -hex 32)"
  cron_secret="$(openssl rand -hex 32)"
  umask 077
  printf '%s\n' \
    'RELEASE_STAGE=staging' \
    'DEPLOY_TARGET=persistent' \
    'BACKGROUND_EXECUTION=worker' \
    'READCOACH_PORT=3010' \
    'APP_URL=http://192.168.0.233:3010' \
    "AUTH_SECRET=$auth_secret" \
    'MONGODB_URI=mongodb://mongo:27017/readcoach' \
    'AI_PROVIDER=openai' \
    'AI_MODEL=gpt-5.6-terra' \
    'CONTENT_STORAGE_PROVIDER=local' \
    'CONTENT_STORAGE_DIR=.data/uploads' \
    'MAX_UPLOAD_BYTES=26214400' \
    'USER_UPLOAD_QUOTA_BYTES=262144000' \
    'MAX_URL_IMPORT_BYTES=5242880' \
    'URL_FETCH_TIMEOUT_MS=15000' \
    "CRON_SECRET=$cron_secret" \
    > .env
fi

chmod 600 .env
rm -f "$archive"

docker compose build web worker
# Volumes created by older releases may belong to root. Repair them before the
# unprivileged web and worker processes start writing private uploads.
docker compose run --rm --no-deps --user root web \
  sh -c 'chown -R 1001:1001 /app/.data/uploads && chmod -R u+rwX,go-rwx /app/.data/uploads'
docker compose up -d
docker compose exec -T web npm run db:migrate
