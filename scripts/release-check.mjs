import { readFileSync } from "node:fs";
import { validateReleaseConfiguration } from "./release-validation.mjs";

function option(name) {
  const prefix = "--" + name + "=";
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf("--" + name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const env = {
  ...process.env,
  DEPLOY_TARGET: option("target") ?? process.env.DEPLOY_TARGET,
  RELEASE_STAGE: option("stage") ?? process.env.RELEASE_STAGE,
};
const legalConfig = readFileSync(new URL("../src/config/legal.ts", import.meta.url), "utf8");
const result = validateReleaseConfiguration({ env, legalConfig });

if (result.errors.length) {
  process.stderr.write(result.errors.join(String.fromCharCode(10)) + String.fromCharCode(10));
  process.exit(1);
}

process.stdout.write(
  "release configuration ok stage=" + result.stage + " target=" + result.target + " background=" + result.backgroundExecution + String.fromCharCode(10),
);