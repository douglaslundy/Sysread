import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "icons", "readcoach-source.svg");
const outputDirectory = path.join(root, "public", "icons");
const sizes = [180, 192, 512];

await mkdir(outputDirectory, { recursive: true });

for (const size of sizes) {
  await sharp(source)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDirectory, "icon-" + size + ".png"));
}

await sharp(source)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outputDirectory, "icon-512-maskable.png"));