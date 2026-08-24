# F5 — Foco/RSVP

Carregar: REQ-FOCUS, UX-FOCUS-001, VE-04, invariantes de progresso em `specs/data-model.md`.

Faça algoritmos puros antes da UI: tokenize → agrupe → calcule ORP → calcule duração. Defina a fórmula em código/documentação curta e cubra pontuação, Unicode, palavras longas e blocos múltiplos. Use relógio monotônico/correção de drift, não uma cadeia ingênua de timeouts.

O player deve pausar ao perder visibilidade se não puder garantir timing, salvar posição em pausa/saída e respeitar Space, setas e Esc. ORP permanece no eixo fixo. Testes usam relógio falso e não esperam tempo real.
