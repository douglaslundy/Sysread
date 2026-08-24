# F3 — Importação

Carregar: REQ-IMP em `specs/requirements.md`, seções de jobs/contents em `specs/data-model.md`, endpoints de importação em `specs/api.md`, segurança de upload/SSRF em `specs/quality.md`.

Implemente pipeline assíncrono, idempotente e observável. A requisição não executa parsing pesado. Preserve o original em storage privado, normalize a saída e registre erro estável. Fixtures devem cobrir PDF com header/footer, EPUB com TOC e HTML com boilerplate.

Para URL: aceite apenas HTTP(S), valide DNS e cada redirect, bloqueie redes privadas/metadata, limite tempo/tamanho e não exponha resposta bruta. Para arquivos: valide magic bytes, quota e limite antes de processar.
