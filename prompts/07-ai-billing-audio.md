# F6–F7 — IA, cobrança e áudio

Para IA, carregar REQ-MAGIC e segurança de IA. Para cobrança, REQ-BILL e contratos Mercado Pago. Para áudio, apenas REQ-AUDIO e o painel VE-03.

- IA: conteúdo é dado não confiável; prompt versionado; cache por sourceHash/model/prompt; limite de custo; saída validada; nenhum texto privado em log.
- Mercado Pago: cliente envia apenas o nome do plano; servidor resolve `preapproval_plan_id`; webhook valida `x-signature`, persiste somente identificadores e reconcilia o recurso pela API antes de atualizar entitlement.
- Áudio: somente faixas licenciadas, política de autoplay, loop/volume/nenhuma e cleanup do player.

Não carregue as três áreas se o item atual pertence a apenas uma.
