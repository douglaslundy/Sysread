import { describe, expect, it, vi } from "vitest";
import { createReadinessHandler } from "../src/app/api/ready/route";

describe("deployment readiness", () => {
  it("reports a cache-free ready response after MongoDB responds", async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const response = await createReadinessHandler(check)();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      checks: { mongodb: "ok" },
      service: "readcoach",
      status: "ready",
    });
    expect(check).toHaveBeenCalledOnce();
  });

  it("returns a safe 503 without exposing the dependency error", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const response = await createReadinessHandler(
      async () => {
        throw new Error("mongodb://secret-host/private");
      },
      50,
    )();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(JSON.stringify(body)).not.toContain("secret-host");
    expect(body).toMatchObject({
      checks: { mongodb: "unavailable" },
      status: "unavailable",
    });
  });

  it("bounds a stalled dependency check", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const response = await createReadinessHandler(
      () => new Promise<void>(() => undefined),
      5,
    )();
    expect(response.status).toBe(503);
  });
});