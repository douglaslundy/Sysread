import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

export function proxy(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id");
  const id = supplied && /^[a-zA-Z0-9_-]{8,80}$/u.test(supplied) ? supplied : randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-correlation-id", id);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-correlation-id", id);
  return response;
}

export const config = { matcher: "/api/:path*" };
