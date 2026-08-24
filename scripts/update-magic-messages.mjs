import fs from "node:fs";
const entries = {
  "src/messages/en.json": {
    action: "Simplify", retry: "Try again", working: "Simplifying", queued: "Magic Reading is preparing this chapter.", error: "The simplified version could not be prepared."
  },
  "src/messages/pt-BR.json": {
    action: "Simplificar", retry: "Tentar novamente", working: "Simplificando", queued: "A Leitura M\u00e1gica est\u00e1 preparando este cap\u00edtulo.", error: "N\u00e3o foi poss\u00edvel preparar a vers\u00e3o simplificada."
  }
};
for (const [path, value] of Object.entries(entries)) {
  const json = JSON.parse(fs.readFileSync(path, "utf8"));
  json.Magic = value;
  fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
}
