import mongoose from "mongoose";
import { getServerEnv } from "../src/lib/env";
import { createRuntimeJobRunner } from "../src/modules/jobs/infrastructure/runtime-job-runner";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const runner = createRuntimeJobRunner(getServerEnv());
  const once = process.argv.includes("--once");
  let stopping = false;
  process.once("SIGINT", () => { stopping = true; });
  process.once("SIGTERM", () => { stopping = true; });

  do {
    const worked = await runner.runNext();
    if (!worked && !once && !stopping) await wait(1_000);
  } while (!once && !stopping);
}

main()
  .catch((error: unknown) => {
    process.stderr.write("Worker failed: " + (error instanceof Error ? error.message : String(error)) + String.fromCharCode(10));
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());