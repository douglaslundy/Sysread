# Arquitetura

## Forma inicial

Monólito modular Next.js com jobs assíncronos. É a menor arquitetura que preserva limites claros sem custo operacional prematuro.

```text
Browser/PWA
  -> Next.js UI + route handlers
      -> módulos de aplicação
          -> MongoDB (metadados, capítulos, progresso)
          -> object storage (uploads/capas/áudio)
          -> fila/worker (parsing, scraping, IA)
          -> Mercado Pago / provedor de IA
```

## Limites

- `ui`: componentes, view models e estados; não conhece SDK de provedor.
- `application`: casos de uso e transações lógicas; depende de interfaces.
- `domain`: entidades, invariantes e algoritmos puros, especialmente tokenização/pacing.
- `infrastructure`: MongoDB, Mercado Pago, storage, fetch seguro, parsers e IA.

## Decisões iniciais

- `ADR-001` — monólito modular; extrair worker separadamente só quando carga/tempo exigir.
- `ADR-002` — MongoDB para documentos e capítulos; blobs não ficam no banco.
- `ADR-003` — processamento pesado fora da requisição; API retorna job ID.
- `ADR-004` — progresso usa checkpoint único por usuário/conteúdo/versão e sessões históricas separadas.
- `ADR-005` — algoritmos RSVP são funções puras e cobertos por testes determinísticos.

## Estrutura-alvo

```text
src/
  app/                 páginas e route handlers finos
  components/          primitives e shell compartilhado
  modules/<capability>/
    domain/            entidades e funções puras
    application/       casos de uso e ports
    infrastructure/    adapters
    ui/                componentes e hooks do módulo
  lib/                 env, db, queue, errors, observability
  messages/            pt-BR.json e en.json
worker/                consumers de importação e IA (quando introduzido)
tests/                 integração, contrato e e2e
```

## Regras de dependência

`domain` não importa React/Next/SDK. `application` só importa domain e ports. `infrastructure` implementa ports. Route handlers validam entrada, autorizam e chamam um caso de uso.
