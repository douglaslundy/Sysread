# Prompt de reconstrução — Sysread

> **Nota antes de usar:** o site `readcoach.com` está atrás de proteção anti-bot, então a
> primeira versão deste prompt foi montada só com texto (manifest PWA, Termos, Privacidade,
> página de preços). Esta versão foi revisada com **prints reais da aplicação logada**
> (biblioteca, leitor de capítulos, modo Foco/RSVP e o modal de Configurações), então o
> layout e as funcionalidades abaixo agora refletem a interface de verdade, não uma
> reconstrução aproximada. Pontos ainda incertos (ex.: telas de Perfil e Cobrança dentro do
> modal de Configurações, comportamento exato do ícone de chat/feedback no topo) estão
> marcados como "não confirmado" — use bom senso de produto para preenchê-los.
>
> Copie tudo dentro do bloco abaixo e cole como instrução inicial para o Claude Code ou Codex.

---

```
Construa do zero um aplicativo web chamado Sysread — um "personal trainer para o
cérebro": um app de leitura dinâmica (speed reading) que usa a técnica RSVP (Rapid
Serial Visual Presentation) para treinar velocidade e foco de leitura, com um modo de
leitura contínua tradicional e um recurso de simplificação de texto por IA. No produto,
o modo RSVP é chamado internamente de "Foco". Slogan da marca: "Personal Trainer for
Your Brain".

======================================================================
1. VISÃO GERAL DO PRODUTO
======================================================================
- Categoria: educação / produtividade. É um PWA instalável, tema escuro por padrão.
- Idioma da interface: **português do Brasil (pt-BR)** é o idioma real usado na
  aplicação logada (todos os textos de UI: "Biblioteca", "Leitor", "Importar",
  "Configurações" etc.). O site institucional (marketing/preços/termos) está em
  inglês. Implemente i18n (ex.: next-intl) com pt-BR como idioma padrão da
  aplicação e en como segundo idioma para as páginas públicas/institucionais.
- O produto trabalha com dois tipos de conteúdo:
  1. Documentos que o próprio usuário importa (PDF, EPUB, link de artigo) —
     "Biblioteca pessoal".
  2. Resumos de livros produzidos/curados pela própria Sysread — "Biblioteca de
     resumos Sysread", navegável por categoria, com opção de o usuário "Solicitar
     resumo" de um livro que ainda não existe na plataforma.
- Diferenciais de produto: além do treino de velocidade (RSVP/"Foco"), o app tem um
  recurso de "Leitura Mágica" que usa IA para reescrever/simplificar texto bagunçado
  (comum em PDFs escaneados/OCR) em prosa limpa e fácil de ler.
- Modelo de negócio: SaaS por assinatura (semanal ou anual), pagamento via Stripe,
  teste grátis apenas no plano anual.

======================================================================
2. STACK TÉCNICA RECOMENDADA
======================================================================
- Frontend: Next.js (App Router) + TypeScript + React + Tailwind CSS.
- i18n: next-intl (ou similar), locale padrão pt-BR.
- PWA: manifest.json + service worker (ex.: next-pwa), instalável, ícones em
  180x180, 192x192 e 512x512.
- Backend: API routes do próprio Next.js (ou serviço Node/Express separado).
- Banco de dados: MongoDB Atlas (via Mongoose ou driver nativo) — contas de
  usuário, conteúdo importado, resumos, progresso de leitura, configurações.
- Pagamentos: Stripe Billing/Subscriptions (Checkout + Customer Portal) com
  webhooks para ativar/cancelar assinaturas.
- Autenticação: e-mail/senha (ou magic link) com sessão via JWT/cookies. Não há
  rotas públicas /login ou /signup — a autenticação acontece via modal dentro da
  própria SPA (shell único em "/").
- IA / LLM: integração com um modelo de linguagem (ex.: API da Anthropic/Claude
  ou OpenAI) para o recurso "Leitura Mágica" (simplificação/reescrita de texto por
  capítulo, com cache do resultado — ver seção 9).
- Processamento de arquivos:
  - PDF: extração de texto (ex.: pdfjs-dist / pdf-parse).
  - EPUB: parsing (ex.: epub.js).
  - Links de artigo: scraping + extração de conteúdo legível (ex.:
    @mozilla/readability + jsdom).
  - Pós-processamento de "limpeza do documento": heurísticas/regras para
    detectar e remover cabeçalhos, rodapés e números de página repetidos,
    com 3 níveis de intensidade configuráveis pelo usuário (ver seção 9).
- Áudio: player simples de música ambiente/foco (loop de faixas royalty-free
  hospedadas em storage/CDN), sem necessidade de streaming complexo.
- Deploy sugerido: Vercel.

======================================================================
3. MAPA DE ROTAS
======================================================================
- "/"        → Shell principal do app (autenticado ou não), com duas visões
               alternadas por abas no cabeçalho: "Leitor" e "Biblioteca".
- "/pricing" → Página estática de planos e preços (em inglês, ver seção 12).
- "/privacy" → Política de privacidade.
- "/terms"   → Termos de serviço.
- Qualquer outra rota → 404 customizada: "Sysread - Page not found" / "404" /
  "Page not found" / botão "Go Home" para "/".

======================================================================
4. CABEÇALHO GLOBAL (presente em toda a aplicação logada)
======================================================================
Da esquerda para a direita:
- Logótipo "Sysread" (texto, bold, branco) no canto esquerdo.
- Navegação central em formato de abas segmentadas (pill): "Leitor" | "Biblioteca".
  A aba ativa tem fundo cinza-escuro/branco suave; a inativa é só texto cinza.
- No canto direito, nesta ordem:
  - Ícone de balão de chat/feedback (não confirmado o comportamento exato —
    implemente como widget de feedback/suporte, ou, alternativamente, como
    ponto de entrada para um assistente de leitura por IA).
  - Botão "Importar" em pill vermelha (#EF4444) com ícone de upload — abre o
    fluxo de importação (seção 8).
  - Avatar circular do usuário (fundo laranja/vermelho em gradiente, iniciais
    em branco) — abre menu de conta e o modal de Configurações (seção 9).

======================================================================
5. TELA "BIBLIOTECA"
======================================================================
Layout em duas colunas lado a lado:

Coluna esquerda — "Biblioteca pessoal":
- Título "Biblioteca pessoal".
- Estado vazio: "No books yet" / "Use Import in the top bar to add PDFs, EPUBs,
  or article links" (mantenha esse texto em inglês só neste estado vazio
  específico, replicando o site original — ou traduza para pt-BR mantendo o
  mesmo tom, já que o resto da UI logada é em português).
- Estado com conteúdo: grade de cards. Cada card mostra:
  - Capa (imagem/ilustração em proporção retrato).
  - Título do livro em fonte serifada, bold.
  - Nome do autor em caixa alta, cinza, com leve espaçamento entre letras.
  - Percentual de progresso de leitura (ex.: "1%") e uma barra de progresso fina
    vermelha na base do card.
  - Clique no card abre o livro na tela "Leitor" (seção 6), na última posição lida.

Coluna direita — "Biblioteca de resumos Sysread":
- Título "Biblioteca de resumos Sysread".
- Dropdown de filtro por categoria no canto superior direito, com opção padrão
  "Todos" (Health, Business, Psychology, Productivity, Self-Help, Philosophy,
  Leadership, Finance, Science, Technology, Biography — ou nomes em pt-BR:
  Saúde, Negócios, Psicologia, Produtividade, Autoajuda, Filosofia, Liderança,
  Finanças, Ciência, Tecnologia, Biografia).
- Grade de cards de resumos, cada card com:
  - Capa ilustrada (arte gerada/estilizada, não a capa oficial do livro).
  - Badge de categoria sobreposto no canto superior direito da capa (pill escura
    semi-transparente, texto branco pequeno, ex.: "Biografia", "Negócios").
  - Título em serifada bold, autor em caixa alta cinza.
  - Sem barra de progresso (a menos que o usuário já tenha começado a ler).
- Estes "resumos" são conteúdo original produzido/curado pela Sysread (texto
  condensado do livro, não o livro na íntegra) — trate como um catálogo de
  conteúdo autoral, semelhante ao modelo de apps como Blinkist, e não como
  hospedagem de obras protegidas na íntegra.
- Botão flutuante fixo no canto inferior direito: "Solicitar resumo" — abre um
  formulário simples (título do livro desejado, autor) que cria uma solicitação
  para a equipe/pipeline de geração de resumos.
- Livros de exemplo observados no catálogo real (use como referência de tom e
  variedade; pode substituir por outros títulos):
  Principles: Life and Work — Ray Dalio; The Art of War — Sun Tzu; As a Man
  Thinketh — James Allen; The Autobiography of Benjamin Franklin — Benjamin
  Franklin; Made to Stick — Chip Heath; Why We Sleep — Matthew Walker; The Hard
  Thing About Hard Things — Ben Horowitz; Never Split the Difference — Chris
  Voss; Hooked — Nir Eyal; Measure What Matters — John Doerr; Good to Great —
  Jim Collins; Influence — Robert B. Cialdini; Grit — Angela Duckworth; Flow —
  Mihaly Csikszentmihalyi; Outliers — Malcolm Gladwell; Essentialism — Greg
  McKeown; Deep Work — Cal Newport; Atomic Habits — James Clear; Meditations —
  Marcus Aurelius; Antifragile — Nassim Nicholas Taleb; Start with Why — Simon
  Sinek; The Psychology of Money — Morgan Housel; Rich Dad Poor Dad — Robert T.
  Kiyosaki; Sapiens — Yuval Noah Harari; Superintelligence — Nick Bostrom.

======================================================================
6. TELA "LEITOR" — MODO DE LEITURA CONTÍNUA
======================================================================
Layout em três colunas:

Sidebar esquerda (colapsável, seta "«" para recolher):
- Título do livro em bold, com badge/botão vermelho "SIMPLIFICAR" ao lado.
- Rótulo "CAPÍTULOS" seguido da lista de capítulos do livro (ex.: "Como usar
  este bônus", "Índice das armadilhas", "01. Mate do Louco", "02. Mate do
  Pastor" etc.). O capítulo atualmente aberto fica destacado (fundo mais claro).
  Capítulos que já têm versão simplificada gerada mostram um badge pequeno
  "Sm" ao lado do nome.
- Abaixo da lista, seção "LEITURA MÁGICA":
  - Botão "Mostrar original" (alterna entre texto original e texto
    simplificado por IA).
  - Texto de status: "Visualizando o texto simplificado" (ou "Visualizando o
    texto original", dependendo do estado atual).

Painel central:
- Título do capítulo atual em destaque.
- Corpo do texto em fonte serifada, tamanho grande (conforme configurado em
  Configurações → Leitura), parágrafos bem espaçados para leitura confortável.
- Um bloco/parágrafo pode aparecer destacado visualmente (fundo levemente
  colorido + borda esquerda vermelha), indicando o último ponto de leitura ou
  um trecho relevante — use isso, por exemplo, para marcar onde o usuário
  parou ou onde o modo Foco vai começar.

Painel direito "FOCO" (colapsável, seta "»" para recolher):
- Cabeçalho "FOCO".
- Controle "Tamanho do texto" com botões "A-" / "A+" para ajuste rápido.
- Toggle "Modo impulso" (atalho para a mesma opção de Configurações).
- Botão grande vermelho "Iniciar Focus aqui" — inicia o modo Foco/RSVP (seção
  7) a partir do parágrafo/posição atual do painel central.
- Seletor "🎵 Música de fundo" (dropdown) na parte inferior — player de faixas
  ambiente/lo-fi para tocar durante a sessão de leitura ou de Foco.

======================================================================
7. MODO "FOCO" (RSVP) — leitura palavra a palavra
======================================================================
Tela dedicada, minimalista, fundo preto puro:
- Cabeçalho: mesmo header global (logo, abas Leitor/Biblioteca, ícone de chat,
  Importar, avatar).
- Logo abaixo do header, uma barra de contexto com:
  - À esquerda: nome do capítulo atual em um dropdown (permite trocar de
    capítulo sem sair do modo Foco).
  - À direita: WPM atual em vermelho, fonte monoespaçada (ex.: "350 WPM"),
    e abaixo dele, menor e cinza, um cronômetro regressivo estimado para o
    fim do capítulo/livro no ritmo atual; ao lado, contador de posição no
    formato "posição atual / total de palavras" (ex.: "23 / 3910").
- Centro da tela: a palavra atual, grande, fonte serifada, com uma letra
  próxima ao início destacada em vermelho (técnica do ORP — Optimal
  Recognition Point) e uma linha vertical fina de fixação atravessando essa
  letra, para o olho do usuário sempre mirar no mesmo ponto horizontal da
  tela enquanto as palavras trocam.
- Rodapé: barra de progresso horizontal fina e vermelha, preenchendo da
  esquerda para a direita conforme o avanço na leitura do capítulo/livro.
- Controles (teclado/toque): espaço para pausar/retomar, setas para
  avançar/retroceder palavra a palavra, Esc para sair do modo Foco e voltar
  ao Leitor na mesma posição.
- Ritmo de exibição: cada palavra fica na tela por um tempo calculado a partir
  do WPM configurado, ajustado dinamicamente ("cognitive pacing") por: número
  de palavras por bloco (1, 2 ou 3, configurável — ver seção 9), pausas mais
  longas em pontuação forte (. ! ?) e vírgulas, e leve desaceleração em
  palavras longas/pouco frequentes. Se "Modo impulso" estiver ativo, o WPM
  aumenta gradualmente ao longo da sessão.
- Ao final do capítulo, se "Continuar capítulos automaticamente" estiver
  ativo, o app avança para o próximo capítulo automaticamente.
- Salvar a posição exata (índice da palavra) a cada pausa/saída, para retomar
  depois de onde parou — tanto no modo Foco quanto no Leitor contínuo.

======================================================================
8. IMPORTAÇÃO DE CONTEÚDO
======================================================================
- Botão "Importar" no header abre um modal/drawer com opções: enviar PDF,
  enviar EPUB, ou colar um link de artigo.
- PDF/EPUB: upload, extração de texto no backend, detecção de capítulos,
  geração de metadados (título, autor se disponível, capa — gerar capa
  placeholder estilizada se o arquivo não tiver uma), salvar no MongoDB
  associado ao usuário.
- Link de artigo: backend busca a URL, extrai o conteúdo principal (remover
  navegação/anúncios/boilerplate), salva como item curto na biblioteca
  pessoal.
- Após a importação, aplicar automaticamente a "Limpeza do documento" no nível
  configurado pelo usuário (ver seção 9) para remover cabeçalhos, rodapés e
  numeração de página repetidos.

======================================================================
9. MODAL "CONFIGURAÇÕES"
======================================================================
Modal com três abas: **Leitura** | **Perfil** | **Cobrança**.

Aba "Leitura":
- "Velocidade de leitura" — slider de 100 a 1000 WPM, com o valor atual
  exibido em vermelho, fonte monoespaçada, alinhado à direita do rótulo (ex.:
  "350 WPM").
- "Modo impulso" (toggle) — "Aumenta a velocidade automaticamente" durante a
  sessão de Foco.
- "Continuar capítulos automaticamente" (toggle) — "Ir automaticamente para o
  próximo capítulo" ao terminar o atual.
- "Palavras por bloco" — seletor de 3 opções: 1, 2 ou 3 palavras exibidas
  juntas por vez no modo Foco.
- "Limpeza do documento" — texto de apoio: "Controla a intensidade com que
  cabeçalhos, rodapés e números de página são removidos deste livro." Opções:
  "Desativado" / "Leve" / "Padrão".
- "Fonte de leitura" — seletor: "Serif" / "Sans" / "Mono", aplicado ao texto
  do Leitor e às palavras exibidas no modo Foco.
- "Tamanho do texto" — seletor: "Pequeno" / "Médio" / "Grande" / "Extra
  grande".
(Estas configurações de leitura devem ser por-livro ou globais por usuário,
  como fizer mais sentido — ex.: "Limpeza do documento" parece ser por-livro
  já que o texto de apoio diz "...deste livro"; as demais podem ser globais.)

Aba "Perfil" (não confirmada em detalhe — implemente com o padrão razoável):
- Nome, e-mail, foto/avatar, alteração de senha, preferência de idioma,
  exclusão de conta.

Aba "Cobrança" (não confirmada em detalhe — implemente com o padrão razoável):
- Plano atual (Anual/Semanal), status da assinatura, próxima data de
  cobrança, link para o Customer Portal do Stripe (gerenciar forma de
  pagamento, cancelar assinatura), histórico de faturas.

======================================================================
10. SIMPLIFICAÇÃO DE TEXTO POR IA ("Leitura Mágica")
======================================================================
- Disponível a partir do botão "SIMPLIFICAR" na sidebar do Leitor.
- Envia o texto do capítulo atual para um modelo de linguagem, com instrução
  para reescrever em português claro e simples, corrigindo problemas comuns de
  extração de PDF/OCR (acentuação perdida, quebras de linha erradas, palavras
  coladas), preservando o sentido original.
- O resultado é cacheado por capítulo (indicado pelo badge "Sm" na lista de
  capítulos) para não reprocessar a cada visita.
- O usuário pode alternar a qualquer momento entre "texto original" e "texto
  simplificado" pelo botão "Mostrar original" / rótulo de status.
- O modo Foco (RSVP) deve poder rodar tanto sobre o texto original quanto
  sobre a versão simplificada, dependendo do que está selecionado no Leitor.

======================================================================
11. MÚSICA DE FUNDO
======================================================================
- Seletor "Música de fundo" no painel "Foco" do Leitor (e opcionalmente também
  dentro do modo Foco/RSVP).
- Dropdown com algumas faixas ambiente/lo-fi pré-definidas (royalty-free) para
  tocar em loop, com controle simples de play/pause e volume.

======================================================================
12. PLANOS E PREÇOS (página "/pricing", em inglês)
======================================================================
H1: "Simple, Transparent Pricing"
Subtítulo: "Choose the plan that works for you"

Dois cards de plano lado a lado:

1) Plano Anual — badge "Best Value"
   - Preço: "$97 per year"
   - Detalhe: "Just $1.87/week • Save 62%"
   - "7-Day Free Trial"
   - Botão: "Start Free Trial"

2) Plano Semanal
   - Preço: "$4.99 per week"
   - Detalhe: "Billed weekly • No trial"
   - Botão: "Subscribe Now"

Recursos incluídos em ambos os planos (lista de checkmarks):
   - Unlimited Books
   - RSVP Speed Training
   - Progress Tracking
   - PDF & EPUB Support

Rodapé da página de preços:
   - "Cancel anytime. No questions asked."

Regras de negócio (extraídas dos Termos de Serviço):
   - Cobrança automática e recorrente conforme o plano escolhido, via Stripe.
   - Cancelamento a qualquer momento pela página de Configurações (aba
     Cobrança); vale a partir do fim do período de cobrança vigente (sem
     reembolso proporcional).
   - Reembolsos geralmente não são concedidos para períodos parciais.

======================================================================
13. PÁGINAS LEGAIS
======================================================================
- "/privacy": coleta de dados (conta, perfil, conteúdo importado, dados de
  pagamento), uso da informação, compartilhamento com provedores terceirizados
  (processador de pagamento, hospedagem de banco de dados, e-mail
  transacional), segurança, retenção de dados, direitos do usuário, cookies,
  política para menores e usuários internacionais. Contato:
  privacy@readcoach.com
- "/terms": licença de uso, menção à tecnologia RSVP, regras de
  assinatura/cobrança/cancelamento/reembolso (seção 12), limitação de
  responsabilidade, seção de contato.

======================================================================
14. IDENTIDADE VISUAL / DESIGN
======================================================================
Confirmado por prints reais + manifest.json:
- Fundo: preto puro (#000000).
- Cards e superfícies elevadas: cinza bem escuro (ex.: #141414–#1a1a1a), quase
  sem contraste com o fundo, criando profundidade sutil.
- Cor de destaque/marca: vermelho #EF4444 — usado de forma consistente em:
  botão "Importar", botão "Iniciar Focus aqui", badge "SIMPLIFICAR", contador
  de WPM, letra ORP destacada no modo Foco, barras de progresso, aba ativa da
  navegação (leve), avatar do usuário (gradiente laranja/vermelho).
- Tipografia: **combinação serifada + sans**. Fonte serifada clássica para
  títulos de livros/resumos (nos cards) e para o corpo de texto do Leitor
  (mesma família também aparece como uma das opções de "Fonte de leitura",
  junto de Sans e Mono). Fonte sans-serif limpa para toda a UI de sistema
  (botões, labels, navegação, configurações).
- Nomes de autores em caixa alta, tamanho pequeno, cinza, com leve
  espaçamento entre letras (tracking).
- Cards de livro/resumo: capa em proporção retrato, cantos moderadamente
  arredondados, badge de categoria como pill escura semi-transparente no
  canto superior direito da capa.
- Controles de configuração (seletores tipo "1/2/3", "Serif/Sans/Mono",
  "Pequeno/Médio/Grande/Extra grande") em formato de grupo de botões
  segmentados, opção ativa com fundo branco/claro e texto escuro, opções
  inativas em cinza-escuro.
- Toggles no estilo iOS (pill com bolinha), cinza quando desativado, vermelho
  quando ativado.
- Também implemente tema claro (paleta espelhada — fundo quase-branco, texto
  quase-preto, mesmo vermelho de destaque), ativado por preferência do sistema
  e por opção manual salva no perfil do usuário.

======================================================================
15. MODELO DE DADOS (sugestão)
======================================================================
- User: id, email, senha (hash), nome, avatar, idioma, tema, criado_em.
- UserReadingSettings: user_id, wpm, palavras_por_bloco, fonte_leitura,
  tamanho_texto, modo_impulso, continuar_capitulos_automaticamente.
- Subscription: user_id, stripe_customer_id, stripe_subscription_id, plano
  (anual/semanal), status (trial/ativa/cancelada), período_atual_fim.
- Book: id, user_id (dono, só para itens da biblioteca pessoal), título,
  autor, capa_url, origem (upload_pdf/upload_epub/link_artigo), categoria,
  nível_limpeza_documento, criado_em.
- Chapter: id, book_id, ordem, título, conteúdo_original,
  conteúdo_simplificado (nullable), simplificado_em (timestamp de cache).
- Summary: id (equivalente a "Book" mas de origem "catálogo Sysread"),
  título, autor, categoria, capa_url, capítulos (mesma estrutura de Chapter).
- SummaryRequest: id, user_id, título_solicitado, autor_solicitado, status
  (pendente/em produção/publicado), criado_em.
- ReadingProgress: id, user_id, book_id (referência a Book ou Summary),
  posição_atual (índice da palavra/capítulo), progresso_percentual,
  concluído (bool), atualizado_em.
- ReadingSession: id, user_id, book_id, wpm_médio, tempo_total_lido,
  palavras_lidas, criado_em (para estatísticas históricas).

======================================================================
16. RESUMO DAS FUNCIONALIDADES-CHAVE A ENTREGAR (ordem de prioridade)
======================================================================
1. Cadastro/login (modal, shell único do app) + i18n pt-BR/en.
2. Importação de PDF, EPUB e link de artigo, com extração e limpeza de texto.
3. Tela "Leitor": sidebar de capítulos, leitura contínua com fonte/tamanho
   configuráveis, painel "Foco" lateral.
4. Modo "Foco" (RSVP): exibição palavra a palavra, destaque ORP, WPM
   configurável, palavras por bloco, cognitive pacing, modo impulso,
   continuar capítulos automaticamente, salvar posição.
5. Tela "Biblioteca": coluna de biblioteca pessoal + coluna de resumos
   Sysread com filtro por categoria e "Solicitar resumo".
6. Recurso "Leitura Mágica" (simplificação de texto por IA) com cache por
   capítulo e alternância original/simplificado.
7. Modal de Configurações com as três abas (Leitura completa; Perfil e
   Cobrança com campos razoáveis).
8. Assinatura via Stripe (dois planos, trial de 7 dias no anual), integrado
   à aba Cobrança das Configurações.
9. Música de fundo (player simples de faixas ambiente).
10. Páginas estáticas de Termos e Privacidade, e página de preços em inglês.
11. PWA instalável (manifest + service worker) com a identidade visual da
    seção 14, suportando tema claro e escuro.
12. Página 404 customizada conforme seção 3.
```
