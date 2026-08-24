# F8 — Qualidade e release

Carregar: `specs/quality.md`, REQ-OPS/REQ-PRIV/REQ-PUB e apenas os contratos dos fluxos sob teste.

Priorize riscos: auth/ownership, SSRF/upload, webhook, conteúdo privado, custo de IA, corrupção de progresso e acessibilidade RSVP. Rode `git diff --check` e varredura de charset antes de commit/deploy. Legal precisa refletir provedores e retenção reais; marque revisão jurídica explicitamente.

Release exige smoke test, observabilidade, migração/seed reproduzível e rollback documentado. Não declare produção pronta com secrets ausentes, testes críticos pulados ou alertas não testados.
