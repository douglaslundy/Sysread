import { describe, expect, it } from "vitest";
import { rateLimitKey, requestIp } from "../src/modules/security/infrastructure/rate-limit";

describe("rate limit identity", () => {
  it("uses deterministic fixed windows without retaining raw identifiers", () => {
    const first = rateLimitKey({ identity: "reader@example.com", now: 61_000, scope: "login", windowMs: 60_000 });
    const second = rateLimitKey({ identity: "reader@example.com", now: 119_999, scope: "login", windowMs: 60_000 });
    expect(first.key).toBe(second.key);
    expect(first.key).not.toContain("reader@example.com");
    expect(first.expiresAt.toISOString()).toBe("1970-01-01T00:02:00.000Z");
  });

  it("takes the first proxy address and has a safe fallback", () => {
    expect(requestIp(new Request("https://read.test", { headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.2" } }))).toBe("203.0.113.5");
    expect(requestIp(new Request("https://read.test"))).toBe("unknown");
  });
});
