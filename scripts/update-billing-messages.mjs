import fs from "node:fs";
const values = {
  "src/messages/en.json": {
    load: "View subscription", none: "No subscription yet.", plans: "View plans",
    plan: "{plan} plan", status: "Status: {status}", next: "Next payment: {date}",
    pause: "Pause", resume: "Resume", cancel: "Cancel", loading: "Updating subscription", error: "Billing could not be updated."
  },
  "src/messages/pt-BR.json": {
    load: "Ver assinatura", none: "Nenhuma assinatura ativa.", plans: "Ver planos",
    plan: "Plano {plan}", status: "Status: {status}", next: "Pr\u00f3ximo pagamento: {date}",
    pause: "Pausar", resume: "Retomar", cancel: "Cancelar", loading: "Atualizando assinatura", error: "N\u00e3o foi poss\u00edvel atualizar a cobran\u00e7a."
  }
};
for (const [path, value] of Object.entries(values)) {
  const json = JSON.parse(fs.readFileSync(path, "utf8"));
  json.Billing = value;
  fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
}
