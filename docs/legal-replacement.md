# Replacing the provisional legal text

The legal pages are complete product drafts with deliberately invalid placeholder identity data.

Before public launch:

1. Replace every value in src/config/legal.ts.
2. Abra `/admin/settings` e preencha a identidade, vigência, legislação, foro, contatos e os textos integrais de Termos e Privacidade.
3. Mantenha os fatos operacionais alinhados à implementação: Mercado Pago, OpenAI, MongoDB, storage privado, exportação, exclusão, metadados de webhook por 90 dias e logs por 30 dias.
4. Remove the provisional notice only after all placeholder values are gone.
5. Run npm run test, npm run typecheck, npm run lint, and npm run build.
6. Search for REPLACE:, example.invalid, and Provisional legal text; the release must fail if any remain.

This document is an implementation handoff checklist, not legal advice.
