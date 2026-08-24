# Protocolo econômico de contexto

Execute esta checagem silenciosamente em quatro checkpoints.

1. **Entrada:** identifique um item do TODO, seus critérios e dependência imediata. Não carregue fases futuras.
2. **Após descoberta:** reduza achados a fatos acionáveis. Grave decisão durável na spec/ADR e descarte logs, listagens e tentativas sem valor futuro.
3. **Antes de editar:** mantenha apenas contrato, arquivos-alvo e testes afetados. Rebusque detalhes pontuais com `rg` em vez de confiar em memória ampla.
4. **Antes de validar:** mantenha diff, critérios de aceite e comandos de qualidade. A próxima tarefa só entra no contexto se depender diretamente do resultado.

Pare a expansão se uma leitura não puder alterar a decisão ou validação atual. Prints só são reabertos quando `specs/visual-evidence.md` não contém o detalhe necessário.
