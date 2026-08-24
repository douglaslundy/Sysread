# Modelo de dados

Todos os documentos têm `createdAt`, `updatedAt` e versão de schema quando relevante.

## Coleções

- `users`: email normalizado único, passwordHash nullable, name, avatarUrl, locale, theme, role (`admin|user`), lifecycleStatus, accessExpiresAt, lastLoginAt.
- `readingSettings`: userId único, wpm, wordsPerBlock, fontFamily, fontSize, boostMode, autoAdvance.
- `subscriptions`: userId único, Mercado Pago payer/subscription/plan IDs, plan, providerStatus, normalizedStatus, nextPaymentDate, lastReconciledAt e lastNotificationId.
- `contents`: ownerId nullable, kind (`personal|summary`), visibility (`public|private`), sourceType, title, author, cover, category, processingStatus, cleanupLevel, sourceMetadata.
- `chapters`: contentId, order, title, originalText, normalizedTextHash, simplified variants, wordCount.
- `readingProgress`: userId + contentId únicos, chapterId, textVariant, wordIndex, paragraphAnchor, percent, revision.
- `readingSessions`: userId, contentId, startedAt, endedAt, wordsRead, averageWpm, mode.
- `rateLimitBuckets`: hashed identity/window key, counter and expiration.
- `billingWebhookEvents`: unique provider event key, resource, timestamp and reconciliation state.
- `uploadQuotas`: ownerId and reserved/used private-storage bytes.
- `summaryRequests`: userId, normalizedTitle, normalizedAuthor, status.
- `jobs`: kind, subjectId, ownerId, state, attempts, errorCode, timestamps, idempotencyKey.
- `appSettings`: documento singleton com identidade, URL pública/TLS, textos jurídicos, integrações de IA/Mercado Pago e alertas. Tokens e segredos usam AES-256-GCM e nunca são retornados pela API administrativa.

## Invariantes

- Conteúdo `personal` exige ownerId; `summary` não tem ownerId e só é publicado por papel administrativo.
- Conteúdo privado só pode ser lido pelo proprietário ou por administrador; conteúdo público precisa estar pronto/publicado.
- Usuário bloqueado ou com acesso expirado não pode executar operações autenticadas protegidas.
- Capítulo é único por `(contentId, order)`.
- Progresso nunca referencia conteúdo sem permissão de leitura.
- `wordIndex` é relativo ao hash/versão do texto; mudança de texto exige remapeamento ou reset explícito.
- Texto simplificado guarda `sourceHash`, `promptVersion`, `model`, `status` e custo/uso agregados.
- Exclusão de usuário inicia rotina idempotente de remoção/anonymização em cascata.

## Índices mínimos

- users: unique emailNormalized.
- contents: `(ownerId, updatedAt)`, `(kind, category, publishedAt)`.
- chapters: unique `(contentId, order)`.
- readingProgress: unique `(userId, contentId)`.
- readingSessions: `(userId, startedAt)` and `(contentId, startedAt)`.
- rateLimitBuckets: unique key and TTL expiration.
- billingWebhookEvents: unique event key and 90-day TTL.
- subscriptions: unique userId, sparse unique Mercado Pago subscription ID e índice por payer ID.
- jobs: unique idempotencyKey, `(state, nextAttemptAt)`.
