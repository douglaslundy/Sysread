import { describe, expect, it, vi } from "vitest";
import { sanitizeAlertFields, sendOperationalAlert } from "../src/lib/alerts";

describe("operational alerts", () => {
  it("delivers a sanitized authenticated payload", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null, { status: 204 });
    });
    await expect(sendOperationalAlert({
      correlationId: "request_12345",
      event: "job_dead_lettered",
      fields: {
        attempts: 3,
        chapterText: "x".repeat(500),
        "invalid-key": "removed",
        jobId: "job-1",
      },
    }, {
      fetcher,
      secret: "alert-secret",
      timeoutMs: 1000,
      url: "https://alerts.example/hooks/readcoach",
    })).resolves.toBe("delivered");

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://alerts.example/hooks/readcoach");
    expect(init?.headers).toMatchObject({ authorization: "Bearer alert-secret" });
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      correlationId: "request_12345",
      event: "job_dead_lettered",
      fields: { attempts: 3, jobId: "job-1" },
      severity: "error",
    });
    expect(body.fields).not.toHaveProperty("chapterText");
  });

  it("is disabled without a destination and never throws on delivery failure", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await expect(sendOperationalAlert({ event: "failure" }, { url: "" }))
      .resolves.toBe("disabled");
    await expect(sendOperationalAlert(
      { event: "failure" },
      {
        fetcher: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          void input;
          void init;
          return new Response(null, { status: 500 });
        }),
        url: "https://alerts.example/hooks/readcoach",
      },
    )).resolves.toBe("failed");
    expect(stderr).toHaveBeenCalled();
    stderr.mockRestore();
  });

  it("removes invalid, oversized and undefined telemetry fields", () => {
    expect(sanitizeAlertFields({
      "bad-key": "removed",
      count: 2,
      longValue: "x".repeat(201),
      missing: undefined,
      validValue: "ok",
    })).toEqual({ count: 2, validValue: "ok" });
  });
});