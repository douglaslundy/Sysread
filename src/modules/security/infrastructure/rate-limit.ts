import { createHash } from "node:crypto";
import { apiError } from "@/lib/api-response";
import { connectToMongo } from "@/lib/db/mongodb";
import { RateLimitBucketModel } from "./rate-limit.model";

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
}

export function rateLimitKey(input: {
  identity: string;
  now: number;
  scope: string;
  windowMs: number;
}) {
  const windowStart = Math.floor(input.now / input.windowMs) * input.windowMs;
  const identityHash = createHash("sha256").update(input.identity, "utf8").digest("hex");
  return {
    expiresAt: new Date(windowStart + input.windowMs),
    key: input.scope + ":" + identityHash + ":" + windowStart,
  };
}

export async function consumeRateLimit(input: {
  identity: string;
  limit: number;
  now?: number;
  scope: string;
  windowMs: number;
}) {
  await connectToMongo();
  const now = input.now ?? Date.now();
  const bucket = rateLimitKey({ ...input, now });
  let record;
  try {
    record = await RateLimitBucketModel.findOneAndUpdate(
      { key: bucket.key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: bucket.expiresAt },
      },
      { returnDocument: "after", upsert: true },
    ).exec();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) {
      throw error;
    }
    record = await RateLimitBucketModel.findOneAndUpdate(
      { key: bucket.key },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    ).exec();
  }
  return {
    allowed: Boolean(record && record.count <= input.limit),
    remaining: Math.max(0, input.limit - (record?.count ?? input.limit)),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now) / 1000)),
  };
}

export function rateLimitResponse(request: Request, retryAfterSeconds: number) {
  const response = apiError(request, "RATE_LIMITED", "Too many requests. Try again later.", 429);
  response.headers.set("retry-after", String(retryAfterSeconds));
  return response;
}
