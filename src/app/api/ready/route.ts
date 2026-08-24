import { NextResponse } from "next/server";
import { connectToMongo } from "@/lib/db/mongodb";
import { logEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DependencyCheck = () => Promise<void>;

async function checkMongo(): Promise<void> {
  const mongo = await connectToMongo();
  const database = mongo.connection.db;
  if (!database) throw new Error("MongoDB database is unavailable.");
  await database.admin().ping();
}

function deadline(milliseconds: number): Promise<never> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Readiness check timed out.")), milliseconds);
    timer.unref?.();
  });
}

export function createReadinessHandler(
  check: DependencyCheck,
  timeoutMs = 5_000,
) {
  return async function readiness() {
    const startedAt = Date.now();
    try {
      await Promise.race([check(), deadline(timeoutMs)]);
      return NextResponse.json(
        {
          checks: { mongodb: "ok" },
          service: "readcoach",
          status: "ready",
          timestamp: new Date().toISOString(),
        },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      logEvent({
        event: "readiness_failed",
        fields: {
          durationMs: Date.now() - startedAt,
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        level: "warn",
      });
      return NextResponse.json(
        {
          checks: { mongodb: "unavailable" },
          service: "readcoach",
          status: "unavailable",
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "cache-control": "no-store",
            "retry-after": "5",
          },
          status: 503,
        },
      );
    }
  };
}

export const GET = createReadinessHandler(checkMongo);