import { createHmac, timingSafeEqual } from "node:crypto";

export function validateMercadoPagoSignature(input: {
  dataId: string;
  requestId: string;
  secret: string;
  signature: string;
  now?: number;
}): { timestamp: number; valid: boolean } {
  const fields = Object.fromEntries(
    input.signature.split(",").map((part) => part.trim().split("=", 2) as [string, string]),
  );
  const timestamp = Number(fields.ts);
  const supplied = fields.v1;
  if (!Number.isFinite(timestamp) || !supplied || !/^[a-f0-9]{64}$/iu.test(supplied)) {
    return { timestamp: 0, valid: false };
  }
  const now = input.now ?? Date.now();
  const timestampMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  if (Math.abs(now - timestampMs) > 5 * 60_000) return { timestamp, valid: false };
  const manifest = "id:" + input.dataId.toLowerCase() + ";request-id:" + input.requestId + ";ts:" + fields.ts + ";";
  const expected = createHmac("sha256", input.secret).update(manifest).digest();
  const actual = Buffer.from(supplied, "hex");
  return { timestamp, valid: actual.length === expected.length && timingSafeEqual(actual, expected) };
}
