# Módulos

Cada diretório representa uma capacidade de negócio e deverá conter `domain`, `application`, `infrastructure` e `ui` apenas quando essas camadas forem necessárias.

- `auth`: conta, sessão e modal de acesso.
- `billing`: planos, checkout, portal e webhooks.
- `catalog`: biblioteca pessoal, resumos e solicitações.
- `importing`: upload, scraping, extração e limpeza.
- `reader`: capítulos, leitura contínua e progresso.
- `focus`: tokenização, ORP, pacing e sessão RSVP.
- `magic-reading`: simplificação, cache e alternância de versão.
- `settings`: preferências globais e por livro.
- `audio`: faixas, player, volume e persistência.
