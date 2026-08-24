# Requisitos do produto

Estados: `MUST`, `SHOULD`, `LATER`. Cada implementação e teste deve citar IDs.

## Plataforma e conta

- `REQ-PLAT-001 MUST` — PWA instalável, responsivo, tema escuro padrão e tema claro por sistema/preferência.
- `REQ-PLAT-002 MUST` — UI autenticada em pt-BR; páginas públicas em inglês; arquitetura pronta para ambos os locales.
- `REQ-AUTH-001 MUST` — cadastro/login em modal dentro do shell `/`, sem rotas públicas obrigatórias de login.
- `REQ-AUTH-002 MUST` — sessão segura em cookie httpOnly, proteção CSRF quando aplicável e autorização por ownership em toda consulta privada.
- `REQ-AUTH-003 SHOULD` — recuperação/alteração de senha, avatar, idioma, tema e exclusão de conta.

## Biblioteca e catálogo

- `REQ-CAT-001 MUST` — biblioteca pessoal com capa, título, autor, progresso e retomada.
- `REQ-CAT-002 MUST` — catálogo de resumos Sysread filtrável por categoria.
- `REQ-CAT-003 MUST` — solicitação de resumo com título, autor, status e prevenção básica de duplicatas.
- `REQ-CAT-004 MUST` — resumos devem ser conteúdo condensado autorizado/original, nunca obra protegida integral sem licença.

## Importação

- `REQ-IMP-001 MUST` — importar PDF e EPUB com validação, extração, metadados, capítulos e capa/placeholder.
- `REQ-IMP-002 MUST` — importar artigo por URL extraindo conteúdo principal.
- `REQ-IMP-003 MUST` — limpeza Desativado/Leve/Padrão removendo ruído repetido sem destruir conteúdo.
- `REQ-IMP-004 MUST` — pipeline assíncrono observável com estados enviado/processando/pronto/falhou e erro acionável.
- `REQ-IMP-005 MUST` — uploads têm limite configurável; importação URL bloqueia IPs privados, redirects perigosos e esquemas não HTTP(S).

## Leitor e progresso

- `REQ-READ-001 MUST` — leitor em três painéis conforme `UX-READ-*`, com sidebars colapsáveis.
- `REQ-READ-002 MUST` — capítulos navegáveis, versão original/simplificada, fonte e tamanho configuráveis.
- `REQ-READ-003 MUST` — marcar e restaurar capítulo, parágrafo/offset e índice de palavra.
- `REQ-READ-004 MUST` — autosave com debounce, flush em pausa/saída e escrita idempotente.

## Foco/RSVP

- `REQ-FOCUS-001 MUST` — tokenização determinística em blocos de 1, 2 ou 3 palavras.
- `REQ-FOCUS-002 MUST` — ORP destacado e alinhado; pontuação, comprimento e raridade ajustam pacing.
- `REQ-FOCUS-003 MUST` — WPM 100–1000, pausar/retomar, setas, Esc e barra/contadores.
- `REQ-FOCUS-004 MUST` — modo impulso aumenta WPM gradualmente com limite definido; autoavanço respeita configuração.
- `REQ-FOCUS-005 MUST` — trocar capítulo e sair preserva posição exata e versão do texto.
- `REQ-FOCUS-006 SHOULD` — acessibilidade: respeitar reduced motion, instruções de teclado e foco visível.

## Leitura Mágica

- `REQ-MAGIC-001 MUST` — simplificar o capítulo atual em português claro, corrigindo ruído de OCR sem mudar sentido.
- `REQ-MAGIC-002 MUST` — cache por capítulo + versão do prompt/modelo + hash do conteúdo original.
- `REQ-MAGIC-003 MUST` — execução assíncrona com estado, retry seguro, limite de custo e auditoria sem expor conteúdo em log.
- `REQ-MAGIC-004 MUST` — alternar original/simplificado; RSVP usa a versão ativa.

## Configurações, áudio e cobrança

- `REQ-SET-001 MUST` — configurações globais: WPM, impulso, autoavanço, palavras/bloco, fonte e tamanho.
- `REQ-SET-002 MUST` — limpeza é override por livro; demais valores são globais com possibilidade futura de override.
- `REQ-AUDIO-001 SHOULD` — faixa ambiente licenciada, loop, play/pause, volume e “nenhuma”.
- `REQ-BILL-001 MUST` — anual US$97 com trial de 7 dias e semanal US$4,99 sem trial, usando `preapproval_plan_id` configuráveis do Mercado Pago; valor e moeda são verificados no servidor.
- `REQ-BILL-002 MUST` — checkout de assinatura do Mercado Pago e gestão in-app de pausa/cancelamento; o servidor nunca confia em plano, preço, moeda ou status enviados pelo cliente.
- `REQ-BILL-003 MUST` — webhooks do Mercado Pago com `x-signature`, idempotência e reconciliação do recurso pela API para tolerar eventos duplicados ou fora de ordem.
- `REQ-BILL-004 MUST` — acesso deriva do status normalizado da assinatura e período vigente.

## Institucional, operação e privacidade

- `REQ-PUB-001 MUST` — `/pricing`, `/privacy`, `/terms` e 404 customizada.
- `REQ-OPS-001 MUST` — logs estruturados com correlation ID, métricas de importação/IA/webhook e alertas de falha.
- `REQ-PRIV-001 MUST` — minimização, retenção, exportação/exclusão e política coerente com provedores reais.
- `REQ-PRIV-002 MUST` — conteúdo privado criptografado em trânsito e protegido em storage/banco; URLs de arquivo temporárias.

## Fora do MVP

- `LATER` colaboração social, marketplace de livros, TTS, app nativo, gamificação complexa e assistente de chat completo.
