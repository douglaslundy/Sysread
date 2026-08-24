import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(request: Request, secret?: string): boolean {
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from("Bearer " + secret, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}