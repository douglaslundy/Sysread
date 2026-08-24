# Qualidade, testes e segurança

## Pirâmide

- Unitários: tokenizer, ORP, pacing, limpeza, progresso, normalização Mercado Pago.
- Integração: repositórios Mongo, authorization, APIs, webhook idempotente, jobs.
- Contrato: parsers com fixtures PDF/EPUB/HTML; provedor IA e Mercado Pago simulados.
- E2E: cadastro, importação, leitura/retomada, Foco, simplificação, checkout sandbox.
- Visual: cinco cenários de `specs/visual-evidence.md` em desktop e breakpoints críticos.

## Gates por PR

`typecheck`, lint, testes afetados, build, `git diff --check`. Alterações visíveis exigem captura visual. Alterações de schema exigem plano de migração/compatibilidade.

## Charset

Procurar U+00C3, U+00C2, U+FFFD e padrões como `Ã§`, `Ã£`, `â€™`, `â€œ`, `â€`. Também revisar `?` no interior de palavras portuguesas. Falso positivo deve ser inspecionado, não removido às cegas.

## Segurança obrigatória

- Hash de senha com algoritmo resistente e parâmetros atuais; cookies secure/sameSite/httpOnly.
- SSRF: resolver DNS, bloquear redes privadas/link-local/metadata, validar cada redirect e limitar bytes/tempo.
- Upload: magic bytes, tamanho, quota, nome aleatório, sem execução, varredura conforme risco.
- IA: delimitar conteúdo como dado não confiável; impedir prompt injection de alterar instruções; saída validada.
- Mercado Pago: assinatura, idempotência, ordenação por timestamp e reconciliação periódica.

## Definição de pronto

Código, testes, estados de UI, logs seguros, docs/contratos atualizados, critérios do item demonstrados e nenhum requisito adjacente quebrado.
