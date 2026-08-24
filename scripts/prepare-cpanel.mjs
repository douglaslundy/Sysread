import { cp, copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

await mkdir(path.join(standalone, ".next"), { recursive: true });
await rm(path.join(standalone, "public"), { force: true, recursive: true });
await rm(path.join(standalone, ".next", "static"), { force: true, recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
await cp(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);
await copyFile(
  path.join(root, "deploy", "cpanel", "app.js"),
  path.join(standalone, "app.js"),
);
process.stdout.write("cPanel standalone bundle prepared in .next/standalone" + String.fromCharCode(10));