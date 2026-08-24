import { describe, expect, it, vi } from "vitest";
import { createCronJobHandler } from "../src/app/api/cron/jobs/route";

const request = (authorization?: string) => new Request(
  "https://read.example/api/cron/jobs",
  { headers: authorization ? { authorization } : undefined },
);

describe("job cron endpoint", () => {
  it("rejects missing or incorrect bearer credentials", async () => {
    const runNext = vi.fn(async () => false);
    const handler = createCronJobHandler(runNext, "cron-secret");
    expect((await handler(request())).status).toBe(401);
    expect((await handler(request("Bearer wrong"))).status).toBe(401);
    expect(runNext).not.toHaveBeenCalled();
  });

  it("processes a bounded batch and disables caching", async () => {
    const runNext = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const response = await createCronJobHandler(runNext, "cron-secret")(
      request("Bearer cron-secret"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ processed: 3 });
    expect(runNext).toHaveBeenCalledTimes(3);
  });

  it("stops on an empty queue and returns a safe traced failure", async () => {
    const empty = vi.fn(async () => false);
    const emptyResponse = await createCronJobHandler(empty, "cron-secret")(
      request("Bearer cron-secret"),
    );
    await expect(emptyResponse.json()).resolves.toEqual({ processed: 0 });

    const failed = vi.fn(async () => { throw new Error("database secret"); });
    const failureResponse = await createCronJobHandler(failed, "cron-secret")(
      request("Bearer cron-secret"),
    );
    expect(failureResponse.status).toBe(500);
    const body = await failureResponse.json();
    expect(body.error).toMatchObject({ code: "JOB_RUNNER_FAILED" });
    expect(JSON.stringify(body)).not.toContain("database secret");
    expect(body.error.requestId).toBeTruthy();
  });
});