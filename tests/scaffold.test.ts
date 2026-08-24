import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  scripts?: Record<string, string>;
};

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageManifest;

describe("project scaffold", () => {
  it("keeps all local quality gates configured", () => {
    expect(manifest.scripts).toMatchObject({
      build: "next build",
      lint: "eslint .",
      test: "vitest run --pool=threads",
      typecheck: "tsc --noEmit",
    });
  });
});