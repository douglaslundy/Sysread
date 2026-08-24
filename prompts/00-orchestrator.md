# Orquestrador

Objetivo: executar exatamente um incremento vertical do `TODO.md`.

1. Leia o item e confirme dependências concluídas no próprio TODO.
2. Carregue o prompt da fase e somente suas specs indicadas.
3. Inspecione o menor conjunto de arquivos com `rg`/leituras direcionadas.
4. Declare um plano curto com um único passo em andamento.
5. Implemente, teste proporcionalmente, verifique UTF-8 e atualize o TODO.
6. Se surgir decisão transversal, registre ADR curto; se não, não crie documentação extra.

Não marque integração como pronta usando mocks de UI. Mocks são permitidos apenas em teste ou story/demo explicitamente rotulada.
