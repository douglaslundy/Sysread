import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function main() {
const document = await PDFDocument.create();
document.setTitle("Sysread Fixture");
document.setAuthor("Quality Team");
const font = await document.embedFont(StandardFonts.Helvetica);
const bold = await document.embedFont(StandardFonts.HelveticaBold);
const pages = [
  ["CHAPTER 1 INTRODUCTION", "Reading improves with deliberate practice.", "A calm environment supports sustained attention."],
  ["CHAPTER 2 PRACTICE", "Short daily sessions create a durable habit.", "Reviewing progress makes the next step visible."],
  ["CHAPTER 3 REFLECTION", "Reflection connects new ideas to prior knowledge.", "Useful notes should remain concise and actionable."],
];

pages.forEach((lines, index) => {
  const page = document.addPage([612, 792]);
  page.drawText("READCOACH TEST FIXTURE", { font: bold, size: 10, x: 72, y: 750 });
  lines.forEach((line, lineIndex) => {
    page.drawText(line, {
      color: rgb(0.1, 0.1, 0.1),
      font: lineIndex === 0 ? bold : font,
      size: lineIndex === 0 ? 16 : 12,
      x: 72,
      y: 680 - lineIndex * 48,
    });
  });
  page.drawText(`Internal test copy - Page ${index + 1}`, { font, size: 9, x: 72, y: 36 });
});

const output = path.join(process.cwd(), "tests/fixtures/sample-with-repeated-margins.pdf");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, await document.save());
process.stdout.write(`${output}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
