import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getServerEnv } from "@/lib/env";
import { logEvent } from "@/lib/observability";
import { purgeDeletedUsers } from "@/modules/privacy/application/purge-deleted-users";

export const maxDuration = 300;
export const runtime = "nodejs";

export function createPrivacyCronHandler(
  purge: () => Promise<number>,
  secret?: string,
) {
  return async function handle(request: Request) {
    if (!isAuthorizedCron(request, secret)) {
      return apiError(
        request,
        "UNAUTHENTICATED",
        "Authentication is required.",
        401,
      );
    }

    try {
      const purged = await purge();
      return NextResponse.json(
        { purged },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      logEvent({
        event: "privacy_purge_failed",
        fields: {
          errorType: error instanceof Error ? error.name : "unknown",
        },
        level: "error",
      });
      return apiError(
        request,
        "PRIVACY_PURGE_FAILED",
        "The privacy purge could not be completed.",
        500,
      );
    }
  };
}

export async function GET(request: Request) {
  const env = getServerEnv();
  return createPrivacyCronHandler(
    () => purgeDeletedUsers(env),
    env.CRON_SECRET,
  )(request);
}