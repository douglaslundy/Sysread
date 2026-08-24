# Backlog executável

Legenda: `[ ]` pendente, `[~]` em andamento, `[x]` concluído, `[!]` bloqueado. Um item só vira `[x]` após cumprir seus critérios e atualizar documentação afetada.

## F0 — Fundação

- [x] `F0-01` Consolidar prompt, prints, arquitetura, requisitos e protocolo de contexto.
- [x] `F0-02` Criar shell visual, rotas públicas iniciais e estrutura modular.
- [x] `F0-03` Instalar/lockar dependências, corrigir scripts de lint/teste e comprovar `typecheck + build`. Depende: F0-02. Aceite: lockfile versionado e CI local verde.
- [x] `F0-04` Configurar i18n pt-BR/en sem forçar prefixo na raiz. Depende: F0-03. Aceite: shell pt-BR, pricing/legal en, locale persistido.
- [x] `F0-05` Criar primitives acessíveis (Button, Modal, Tabs, Toggle, Segmented, Slider, Select, Toast, Skeleton). Depende: F0-03. Aceite: teclado, foco, estados e testes básicos.
- [x] `F0-06` PWA: manifest, ícones, service worker e estratégia offline segura. Depende: F0-03. Aceite: instalável; shell abre offline sem cachear dados privados indevidamente.

## F1 — Persistência e autenticação

- [x] `F1-01` Configurar env validado, conexão Mongo e repositories. Depende: F0-03. Aceite: falha rápida sem env; integração isolada.
- [x] `F1-02` Modelos/índices User, Settings, Content, Chapter, Progress e Job. Depende: F1-01. Aceite: invariantes/índices de `specs/data-model.md`.
- [x] `F1-03` Cadastro/login/logout/sessão e modal no shell. Depende: F0-05, F1-02. Aceite: REQ-AUTH-001/002 e testes de ownership.
- [x] `F1-04` Perfil, idioma/tema, senha e exclusão idempotente. Depende: F1-03. Aceite: REQ-AUTH-003, REQ-PRIV-001.

## F2 — Biblioteca e catálogo

- [x] `F2-01` APIs de biblioteca e catálogo com cursor/filtro. Depende: F1-02/03. Aceite: REQ-CAT-001/002.
- [x] `F2-02` UI responsiva da biblioteca e estados loading/vazio/erro. Depende: F0-05, F2-01. Aceite: regressão visual VE-05.
- [x] `F2-03` Solicitar resumo + moderação/status mínimo. Depende: F2-01. Aceite: REQ-CAT-003/004.
- [x] `F2-04` Seed de resumos originais/licenciados e capas abstratas próprias. Depende: F2-01. Aceite: nenhum texto/capa protegido copiado indevidamente.

## F3 — Importação

- [x] `F3-01` Storage privado, quotas e upload seguro PDF/EPUB. Depende: F1-03. Aceite: REQ-IMP-001/005.
- [x] `F3-02` Job runner com retry, idempotência, progresso e dead-letter operacional. Depende: F1-02. Aceite: REQ-IMP-004.
- [x] `F3-03` Parser PDF com fixtures e detecção de capítulos/metadados. Depende: F3-01/02. Aceite: texto determinístico e erros acionáveis.
- [x] `F3-04` Parser EPUB com TOC/spine/capa e fixtures. Depende: F3-01/02.
- [x] `F3-05` Importação URL com Readability e defesa SSRF completa. Depende: F3-02. Aceite: REQ-IMP-002/005.
- [x] `F3-06` Limpeza em três níveis e preview/override por livro. Depende: F3-03/04/05. Aceite: REQ-IMP-003 sem perda relevante em fixtures.
- [x] `F3-07` Modal de importação e acompanhamento do job. Depende: F0-05, F3-01..06. Aceite: sucesso e recuperação de falha nos três tipos.

## F4 — Leitor contínuo

- [x] `F4-01` API de conteúdo/capítulos e autorização. Depende: F2-01, F3-03/04/05.
- [x] `F4-02` Layout desktop de três painéis e colapso. Depende: F0-05, F4-01. Aceite: VE-03, UX-READ-001.
- [x] `F4-03` Navegação de capítulos, tipografia, âncora atual e versão ativa. Depende: F4-02.
- [x] `F4-04` Progresso com revision, debounce, flush e retomada. Depende: F1-02, F4-03. Aceite: REQ-READ-003/004 sob refresh e duas abas.
- [x] `F4-05` Modal Leitura completo e override de limpeza. Depende: F0-05, F4-02. Aceite: VE-01/02 e REQ-SET-001/002.
- [x] `F4-06` Adaptação mobile/tablet do leitor. Depende: F4-02/03. Aceite: nenhuma coluna inacessível; foco/reader continuam operáveis.

## F5 — Foco/RSVP

- [x] `F5-01` Tokenizer e mapeamento texto↔palavra determinísticos. Depende: F4-03. Aceite: Unicode, pontuação, blocos 1/2/3 e testes de regressão.
- [x] `F5-02` Algoritmo ORP e pacing puro. Depende: F5-01. Aceite: REQ-FOCUS-001/002 e testes com relógio falso.
- [x] `F5-03` Player RSVP: relógio, pausa, setas, Esc, contadores e progresso. Depende: F5-02. Aceite: VE-04 e REQ-FOCUS-003.
- [x] `F5-04` Impulso, troca/autoavanço de capítulo e persistência. Depende: F5-03, F4-04. Aceite: REQ-FOCUS-004/005.
- [x] `F5-05` Acessibilidade, reduced motion e comportamento background/visibility. Depende: F5-03. Aceite: sem avanço silencioso quando tab suspende; REQ-FOCUS-006.

## F6 — Leitura Mágica

- [x] `F6-01` Port de IA, prompt versionado, schema de saída e orçamento. Depende: F3-02. Aceite: REQ-MAGIC-001/003.
- [x] `F6-02` Cache por hash/modelo/prompt e job idempotente. Depende: F6-01, F4-01. Aceite: chamada repetida não recobra sem mudança.
- [x] `F6-03` UI Simplificar, badge Sm, estados e alternância. Depende: F6-02, F4-03. Aceite: VE-03 e REQ-MAGIC-004.
- [x] `F6-04` Integrar texto simplificado ao tokenizer/progresso RSVP. Depende: F5-01/04, F6-03. Aceite: troca de versão não corrompe checkpoint.

## F7 — Cobrança e áudio

- [x] `F7-01` Página pricing completa e Plan IDs do Mercado Pago server-side. Depende: F0-04/05. Aceite: texto/preços de REQ-BILL-001.
- [x] `F7-02` Checkout de assinatura, gestão e aba Cobrança. Depende: F1-03, F7-01.
- [x] `F7-03` Webhooks idempotentes, reconciliação e entitlement. Depende: F7-02. Aceite: eventos repetidos/fora de ordem.
- [x] `F7-04` Player de faixas licenciadas, loop, volume e persistência. Depende: F4-02. Aceite: REQ-AUDIO-001 e política de autoplay.

## F8 — Legal, operação e release

- [~] `F8-01` Termos/Privacidade alinhados a provedores e revisão jurídica. Depende: decisões de produção.
- [x] `F8-02` Logs, métricas, tracing, alertas e runbooks sem conteúdo sensível. Depende: módulos principais.
- [x] `F8-03` Testes E2E, acessibilidade, visual e performance. Depende: F1–F7.
- [x] `F8-04` Threat model, retenção/exportação/exclusão e revisão de segurança. Depende: F1–F7.
- [~] `F8-05` Deploy preview → staging → produção, migração/seed, smoke e rollback. VPS de teste publicada e validada; produção depende da infraestrutura e dos segredos definitivos.

## F9 — Evolução Sysread

- [x] `F9-01` Aplicar a marca Sysread e tornar o nome público configurável no painel.
- [x] `F9-02` Corrigir tema claro/escuro e validar contraste, responsividade e navegação pública.
- [x] `F9-03` Implementar papéis, expiração, bloqueio e autorização administrativa no backend.
- [x] `F9-04` Implementar dashboard, usuários, conteúdos e configurações com dados reais.
- [x] `F9-05` Corrigir importação do O Globo, retry idempotente, charset e mensagens seguras.
- [x] `F9-06` Implementar RSVP 1/2/3 palavras e modos Por parágrafo/Contínua com persistência.
- [x] `F9-07` Migrar dados, promover administrador e validar a versão na VPS de teste.

## Próximo item recomendado

## F10 — Configuração operacional no painel

- [x] `F10-01` Centralizar identidade, domínio/TLS, Mercado Pago, IA, alertas e textos jurídicos no ambiente administrativo.
- [x] `F10-02` Criptografar segredos em repouso e impedir retorno em HTML, API e logs.
- [x] `F10-03` Aplicar as configurações salvas em checkout, webhooks, IA, alertas e páginas públicas sem rebuild.
- [x] `F10-04` Disponibilizar testes de integração e indicadores de prontidão para produção.

Pendências externas limitam-se a obter as contas/credenciais dos provedores, registrar o domínio, terminar o TLS no proxy/hospedagem e fornecer os textos oficiais. Todos esses valores são inseridos pelo administrador em `/admin/settings`.

## F11 — Correções mobile do leitor

- [x] `F11-01` Preservar espaços entre palavras nos blocos RSVP/ORP.
- [x] `F11-02` Ajustar dinamicamente a fonte de blocos 1/2/3 ao maior tamanho que caiba em uma linha.
- [x] `F11-03` Manter o layout mobile em dispositivos de toque mesmo com zoom e impedir overflow horizontal.
