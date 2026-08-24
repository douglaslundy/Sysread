import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalog = JSON.parse(
  await readFile(
    path.join(root, "src/modules/catalog/seed/summary-catalog.json"),
    "utf8",
  ),
);
const outputDirectory = path.join(root, "public/covers/summaries");
await mkdir(outputDirectory, { recursive: true });

function coverSvg(palette, index) {
  const [background, accent, paper] = palette;
  const shift = 70 + index * 24;
  return `
    <svg width="800" height="1200" viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="1200" fill="${background}"/>
      <circle cx="${180 + shift}" cy="340" r="230" fill="${paper}" opacity="0.92"/>
      <rect x="${90 + index * 12}" y="590" width="620" height="92" rx="46" fill="${accent}"/>
      <path d="M0 ${880 - shift} L800 ${610 + shift} L800 1200 L0 1200 Z" fill="${paper}" opacity="0.82"/>
      <path d="M0 ${970 - shift} L800 ${770 + shift} L800 1200 L0 1200 Z" fill="${accent}" opacity="0.9"/>
      <circle cx="650" cy="180" r="52" fill="none" stroke="${accent}" stroke-width="24"/>
    </svg>`;
}

for (const [index, entry] of catalog.entries()) {
  await sharp(Buffer.from(coverSvg(entry.palette, index)))
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDirectory, `${entry.slug}.png`));
}

process.stdout.write(`Capas geradas: ${catalog.length}\n`);