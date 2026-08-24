import fs from "node:fs";
import path from "node:path";

const sampleRate = 22050;
const seconds = 12;
const samples = sampleRate * seconds;
const bytes = Buffer.alloc(44 + samples * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(36 + samples * 2, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(sampleRate, 24);
bytes.writeUInt32LE(sampleRate * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) {
  const time = i / sampleRate;
  const fade = Math.min(1, i / 2000, (samples - i) / 2000);
  const wave = Math.sin(2 * Math.PI * 110 * time) * 0.45 +
    Math.sin(2 * Math.PI * 165 * time) * 0.3 +
    Math.sin(2 * Math.PI * 220 * time) * 0.12;
  bytes.writeInt16LE(Math.round(wave * fade * 4200), 44 + i * 2);
}
const directory = path.join("public", "audio");
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, "deep-focus.wav"), bytes);
