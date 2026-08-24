import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getServerEnv } from "@/lib/env";
import { logEvent } from "@/lib/observability";
import { createRuntimeJobRunner } from "@/modules/jobs/infrastructure/runtime-job-runner";

export const maxDuration = 300;
export const runtime = "nodejs";

export function createCronJobHandler(
  runNext: () => Promise<boolean>,
  secret?: string,
) {
  return async function handle(request: Request) {
    if (!isAuthorizedCron(request, secret)) {
      return apiError(request, "UNAUTHENTICATED", "Authentication is required.", 401);
    }

    try {
      let processed = 0;
      while (processed < 3 && await runNext()) processed += 1;
      logEvent({ event: "cron_jobs_processed", fields: { processed } });
      return NextResponse.json(
        { processed },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      logEvent({
        event: "cron_jobs_failed",
        fields: { errorType: error instanceof Error ? error.name : "unknown" },
        level: "error",
      });
      return apiError(request, "JOB_RUNNER_FAILED", "Background jobs could not be processed.", 500);
    }
  };
}

export async function GET(request: Request) {
  const env = getServerEnv();
  const runner = createRuntimeJobRunner(env);
  return createCronJobHandler(() => runner.runNext(), env.CRON_SECRET)(request);
}