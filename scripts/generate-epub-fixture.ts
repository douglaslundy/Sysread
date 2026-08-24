import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";
import sharp from "sharp";

const encode = (value: string) => new TextEncoder().encode(value);

async function main() {
  const cover = await sharp({
    create: { background: "#E96B52", channels: 3, height: 120, width: 80 },
  }).png().toBuffer();
  const archive = zipSync(
    {
      mimetype: [encode("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": encode(`<?xml version="1.0"?>
        <container><rootfiles><rootfile full-path="OEBPS/package.opf"/></rootfiles></container>`),
      "OEBPS/package.opf": encode(`<?xml version="1.0"?>
        <package>
          <metadata><title>Fixture EPUB</title><creator>Quality Team</creator></metadata>
          <manifest>
            <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
            <item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
            <item id="two" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
            <item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/>
          </manifest>
          <spine><itemref idref="one"/><itemref idref="two"/></spine>
        </package>`),
      "OEBPS/nav.xhtml": encode(`<html><body><nav><ol>
        <li><a href="chapter-1.xhtml">Start Here</a></li>
        <li><a href="chapter-2.xhtml">Deep Practice</a></li>
      </ol></nav></body></html>`),
      "OEBPS/chapter-1.xhtml": encode(`<html><head><title>Internal One</title></head><body>
        <h1>Internal Heading</h1><p>The first chapter has useful content.</p>
        <script>throw new Error('must not execute')</script>
      </body></html>`),
      "OEBPS/chapter-2.xhtml": encode(`<html><head><title>Internal Two</title></head><body>
        <h1>Another Heading</h1><p>The second chapter follows the declared spine order.</p>
      </body></html>`),
      "OEBPS/cover.png": new Uint8Array(cover),
    },
    { level: 6 },
  );
  const output = path.join(process.cwd(), "tests/fixtures/sample-with-toc.epub");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, archive);
  process.stdout.write(`${output}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});