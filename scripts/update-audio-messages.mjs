import fs from "node:fs";
const values = {
  "src/messages/en.json": {
    title: "Ambient sound", track: "Track", none: "None", deepFocus: "Deep focus (original)",
    volume: "Volume {value}%", volumeLabel: "Ambient volume", play: "Play", pause: "Pause",
    blocked: "Press play again to allow audio."
  },
  "src/messages/pt-BR.json": {
    title: "Som ambiente", track: "Faixa", none: "Nenhuma", deepFocus: "Foco profundo (original)",
    volume: "Volume {value}%", volumeLabel: "Volume do ambiente", play: "Tocar", pause: "Pausar",
    blocked: "Pressione tocar novamente para permitir o \u00e1udio."
  }
};
for (const [path, value] of Object.entries(values)) {
  const json = JSON.parse(fs.readFileSync(path, "utf8"));
  json.Audio = value;
  fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
}
