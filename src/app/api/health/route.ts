import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "readcoach",
    status: "ok",
    timestamp: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
