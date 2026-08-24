# ADR-001 — Monólito modular com jobs

Status: aceito em 2026-08-17.

## Decisão

Iniciar com Next.js como aplicação web/API, módulos por capacidade e processamento pesado por jobs. MongoDB guarda documentos; object storage guarda blobs.

## Consequências

Entrega e operação começam simples, enquanto imports/IA não bloqueiam requests. Fronteiras de módulo devem ser respeitadas para permitir extrair o worker ou serviço específico se métricas reais justificarem.
