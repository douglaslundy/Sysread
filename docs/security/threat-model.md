# Threat model

## Assets and trust boundaries

Private uploads and chapter text, credentials, sessions, reading progress, AI budget and subscription entitlement are sensitive. Browser input, imported documents, remote URLs, AI output and webhook bodies are untrusted. MongoDB, private storage, OpenAI and Mercado Pago are external trust boundaries.

## Principal threats and controls

| Threat | Controls | Residual action |
|---|---|---|
| Account takeover | Argon2id, HTTP-only SameSite cookie, auth version revocation, same-origin mutations, persistent per-IP rate limits | Add edge limits as defense in depth and monitor login failures |
| Cross-user reads | Repository ownership predicates and public-summary publication rules | Run authorization regression tests on every release |
| Malicious upload or URL | Magic-byte/size/quota checks, random private keys, redirect-aware SSRF DNS controls, byte/time limits | Add malware scanning when risk or scale requires |
| Prompt injection/data leakage | Chapter is delimited as untrusted data, versioned prompt, strict schema, no content logs, OpenAI `store:false` | Review provider retention contract before launch |
| AI cost exhaustion | Per-user daily job cap, chapter size and token budgets, cache/idempotency | Alert on token growth and 429s |
| Progress corruption | Text hash, variant, optimistic revision, debounce and exit flush | Preserve reset/remapping rule on text migrations |
| Billing spoof/replay | Server plan mapping and plan verification, HMAC timestamp window, constant-time comparison, unique events, API reconciliation | Rotate webhook secret and test sandbox events |
| XSS/clickjacking | React escaping, validation, CSP, frame denial, content-type and referrer headers | Remove inline CSP allowance when nonce support is introduced |
| Data remanence | Export endpoint, immediate access revocation, idempotent purge worker, 90-day webhook TTL | Schedule purge and backup-expiry jobs |

## Data deletion

`DELETE /api/me` revokes the account and marks it `deleting`. Run `npm run privacy:purge` from a full-source host or call the authenticated `/api/cron/privacy` endpoint from a standalone deployment. The purge removes private chapters, content, progress, settings, jobs, requests, quotas, subscription links and local storage objects, then anonymizes the account record. Backups must expire according to the production retention schedule.

Review this model after provider, storage, authentication or deployment changes.
