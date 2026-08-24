# Regras globais do Codex

## Charset e encoding

- Sempre preservar arquivos em UTF-8.
- Nunca reescrever arquivos usando encoding ANSI, Windows-1252, Latin-1 ou codepage do PowerShell.
- Em projetos com português, preservar acentos reais: `ç`, `ã`, `õ`, `á`, `é`, `í`, `ó`, `ú`.
- Não inserir texto acentuado em comandos inline do PowerShell quando o comando for gravar arquivo.
- Para edições manuais, preferir `apply_patch`.
- Para scripts que leem/gravam arquivos, usar explicitamente `encoding='utf-8'`.
- Antes de commit, push ou deploy, verificar se não foram introduzidos sinais de mojibake, incluindo os code points U+00C3, U+00C2, U+FFFD e sequências corrompidas comuns de aspas/reticências/travessões vindas de UTF-8 lido como Windows-1252.
- Também procurar palavras portuguesas quebradas por sinais de interrogação no lugar de acentos.

## Validação obrigatória antes de commit/deploy

- Rodar `git diff --check`.
- Quando houver alteração em texto visível, rodar uma varredura de charset antes de commitar.
- Se a varredura encontrar charset quebrado, corrigir antes de build, commit, push ou deploy.

## Cuidados no Windows/PowerShell

- Evitar comandos inline que regravem arquivos com texto acentuado.
- Quando for indispensável usar script, gravar com UTF-8 explícito e preferir escapes Unicode para texto acentuado.
- Não usar `Set-Content` sem `-Encoding utf8` para arquivos de projeto.

## Segurança e contexto

- Nunca persistir senha, token, segredo Mercado Pago ou conteúdo privado em logs.
- Carregar somente os arquivos necessários para a tarefa atual e a seguinte.
- Webhooks devem validar assinatura e ser idempotentes.