# Design system

## Tokens confirmados

- Fundo `#000000`; superfícies `#141414` e `#1a1a1a`; bordas `#262626`.
- Acento `#EF4444`; texto principal quase branco; secundário cinza azulado.
- UI em sans; títulos/corpo de leitura em serif; métricas em mono.
- Radius: 8 para tabs/segmentos, 12 para botões, 16 para cards, ~22 para modal.
- Movimento curto (120–200 ms); RSVP não usa transição entre palavras.

## IDs de layout

- `UX-HDR-001`: header 52–64 px, logo esquerda, tabs centro, feedback/importar/avatar direita.
- `UX-LIB-001`: desktop em duas colunas, resumo em grade 3; tablet/mobile empilha e reduz colunas.
- `UX-READ-001`: desktop com sidebar 285, conteúdo fluido, painel foco 230; ambos colapsáveis.
- `UX-FOCUS-001`: palavra/ORP centralizados no mesmo eixo; contexto acima e progresso no rodapé.
- `UX-SET-001`: modal rolável com header e tabs estáveis, segmentos ocupam largura.

## Estados obrigatórios

Todo fluxo tem: loading não bloqueante, vazio, sucesso, erro recuperável, sem permissão e offline quando aplicável. Botões assíncronos impedem duplo envio e comunicam progresso via texto/ARIA.

## Acessibilidade

- Contraste WCAG AA; navegação integral por teclado; focus ring visível.
- Modal prende foco, fecha por Esc e devolve foco ao gatilho.
- Preferências não dependem apenas de cor; toggles têm label/description.
- RSVP oferece pausa imediata, reduced motion e anúncio opcional sem atualizar live region a cada palavra.
