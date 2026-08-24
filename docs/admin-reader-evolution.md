# Evolução administrativa e de leitura

## Migração de dados

Execute `npm run db:migrate` antes de liberar a versão. A migração é idempotente e preenche:

- `users.role=user`, `users.schemaVersion=2` e os campos opcionais de validade/último acesso;
- `contents.visibility=public` para resumos e `private` para importações pessoais;
- o documento singleton de configurações com o nome `Sysread` quando ainda não existir.

Um administrador inicial é criado a partir de uma conta existente com `npm run admin:promote -- email`. A operação incrementa a versão de autenticação, revogando sessões anteriores.

## Leitor

O modo Foco/RSVP preserva o ponto central de fixação para blocos de uma, duas ou três palavras. A preferência fica persistida em `readingSettings`. Em `Por parágrafo`, a reprodução pausa ao concluir o parágrafo atual; em `Contínua`, avança entre parágrafos e capítulos até terminar o texto.

Em telas estreitas, o bloco completo mantém espaços e `white-space` em uma única linha. O tamanho configurado funciona como limite preferido e é reduzido por medição real do conteúdo até caber na largura disponível. Dispositivos de toque permanecem no layout de uma coluna mesmo quando o zoom altera a largura em pixels CSS.

## Importação por URL

O fetcher valida DNS e IP em cada redirecionamento, rejeita redes privadas, aceita páginas públicas e decodifica o charset declarado. O callback DNS suporta a forma vetorial exigida pelo Undici/Node atual. URLs repetidas reaproveitam a chave idempotente; jobs anteriormente falhos são recolocados na fila de forma segura. Erros apresentados ao usuário são mensagens estáveis e não expõem detalhes internos.

## Autorização

O backend é a fonte de verdade. Rotas administrativas exigem `role=admin`; conteúdo privado exige propriedade ou administração; bloqueio e expiração são verificados em cada operação protegida. A interface apenas reflete essas regras.

## Configuração operacional pelo administrador

Em `/admin/settings`, o administrador configura o nome da plataforma, URL pública e modo TLS, planos/token/webhook do Mercado Pago, modelo/chave da IA, webhook de alertas e identidade/textos jurídicos. Alterações entram em vigor sem rebuild. Variáveis de ambiente continuam como fallback de recuperação.

Segredos são criptografados com AES-256-GCM usando uma chave derivada de `AUTH_SECRET`. A API retorna somente indicadores de presença; valores gravados nunca reaparecem no HTML, JSON ou logs. A terminação e renovação do certificado TLS continuam sob responsabilidade do proxy reverso ou da hospedagem, enquanto a plataforma usa a URL HTTPS definida pelo administrador.
