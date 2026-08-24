# F4 — Leitor

Carregar: REQ-READ/REQ-SET, `specs/api.md` seção Leitura, VE-01/02/03 e UX-READ/UX-SET.

Construa um incremento funcional do leitor. Mantenha conteúdo e sidebars semanticamente separados, com colapso acessível. Progresso usa revision e checkpoint compatível com a versão do texto. Autosave é debounced; pause, troca de capítulo e unload tentam flush sem duplicar sessão.

Se medir UI, abra somente o print correspondente. Teste retomada após refresh, troca de capítulo, conflito simples de duas abas, foco do modal e preferências persistidas.
