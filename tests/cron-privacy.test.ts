import { describe, expect, it, vi } from "vitest";
import { createPrivacyCronHandler } from "../src/app/api/cron/privacy/route";

const secret = "s".repeat(32);

function request(value?: string) {
  return new Request("https://readcoach.test/api/cron/privacy", {
    headers: value ? { authorization: value } : undefined,
  });
}

describe("privacy cron endpoint", () => {
  it("rejects missing and invalid credentials without running purge", async () => {
    const purge = vi.fn().mockResolvedValue(0);
    const handler = createPrivacyCronHandler(purge, secret);
    expect((await handler(request())).status).toBe(401);
    expect((await handler(request("Bearer wrong"))).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs one bounded purge batch and disables caching", async () => {
    const purge = vi.fn().mockResolvedValue(7);
    const response = await createPrivacyCronHandler(purge, secret)(
      request("Bearer " + secret),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ purged: 7 });
    expect(purge).toHaveBeenCalledOnce();
  });

  it("returns a safe error when purge fails", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const response = await createPrivacyCronHandler(
      async () => {
        throw new Error("mongodb://secret/private");
      },
      secret,
    )(request("Bearer " + secret));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(body.error.code).toBe("PRIVACY_PURGE_FAILED");
  });
});