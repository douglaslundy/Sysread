# F1–F2 — Conta e catálogo

Carregar: `specs/requirements.md` (somente REQ-AUTH/REQ-CAT/REQ-PRIV), `specs/data-model.md`, `specs/api.md`; para biblioteca, VE-05 e UX-LIB-001.

Autorização por ownership deve estar no caso de uso/repositório, não só na UI. Normalize email e entradas de solicitação. Nunca retorne passwordHash ou IDs secretos. A biblioteca deve usar cursor e mostrar estados loading, vazio, erro e retomada. Conteúdo de resumo precisa ter procedência editorial/licença clara.

Teste ao menos: usuário A não lê/altera dados de B; sessão expirada; cursor; filtro; duplicata de solicitação.
