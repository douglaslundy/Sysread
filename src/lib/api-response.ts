import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export function correlationId(request?: Request) {
  const supplied = request?.headers.get("x-correlation-id");
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/u.test(supplied) ? supplied : randomUUID();
}

export function apiError(
  request: Request | undefined,
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const requestId = correlationId(request);
  return NextResponse.json(
    { error: { code, message, requestId, ...(details === undefined ? {} : { details }) } },
    { headers: { "x-correlation-id": requestId }, status },
  );
}