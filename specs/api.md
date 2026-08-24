# Contratos de API

Formato de erro: `{ "error": { "code": "STABLE_CODE", "message": "safe text", "requestId": "...", "details": {} } }`.

## Conta

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
- `GET/PATCH /api/me`, `DELETE /api/me`.
- `GET /api/me/export` gera a exportação dos dados pessoais do usuário autenticado.
- `GET/PATCH /api/me/reading-settings`.

## Conteúdo

- `GET /api/library?cursor=` — pessoal + progresso.
- `GET /api/summaries?category=&cursor=`.
- `POST /api/summary-requests`.
- `POST /api/imports` multipart para PDF/EPUB; retorna `202 { jobId, contentId }`.
- `POST /api/imports/url` com URL; retorna `202`.
- `GET /api/jobs/:id` — estado autorizado.
- `GET /api/contents/:id`, `GET /api/contents/:id/chapters`.

## Leitura

- `GET /api/contents/:id/chapters/:chapterId` com `variant=original|simplified`.
- `GET/PUT /api/contents/:id/progress` idempotente; exige `revision` para detectar escrita obsoleta.
- `POST /api/reading-sessions`, `PATCH /api/reading-sessions/:id`.
- `POST /api/chapters/:id/simplifications` retorna job/cache existente.

## Cobrança

- `POST /api/billing/checkout` recebe apenas `plan=annual|weekly`; o servidor resolve o `preapproval_plan_id` e retorna o `init_point`.
- `GET /api/billing/subscription` consulta o estado normalizado; `PATCH /api/billing/subscription` aceita apenas `action=pause|resume|cancel`.
- `POST /api/webhooks/mercadopago` valida `x-signature`, persiste o identificador do evento e reconcilia `/preapproval/{id}` antes de atualizar o estado idempotentemente.

## Operação

- `GET /api/health` retorna liveness sem dados sensíveis.

## Administração

Todas as rotas abaixo exigem sessão com `role=admin`; mutações também validam origem e entrada com Zod.

- `GET /api/admin/dashboard` retorna métricas reais, evolução de cadastros, conteúdo mais acessado e usuários recentes.
- `GET /api/admin/users`; `PATCH /api/admin/users/:id` bloqueia/desbloqueia e ajusta validade de acesso.
- `GET/PATCH /api/admin/settings` consulta ou altera identidade, domínio/TLS, Mercado Pago, IA, alertas e textos jurídicos; respostas expõem somente indicadores de segredo configurado.
- `GET/POST /api/admin/contents`; `PATCH/DELETE /api/admin/contents/:id` gerencia conteúdo e visibilidade.

## Regras transversais

- Zod em toda entrada; resposta não expõe hashes, IDs secretos nem dados de outro owner.
- Limites por IP/usuário em autenticação, importação, solicitações e IA.
- Cursor opaco; nunca paginação baseada em offset para coleções crescentes.
- Jobs expõem códigos estáveis (`UNSUPPORTED_FILE`, `FETCH_BLOCKED`, `PARSE_FAILED`, `AI_LIMIT`).
