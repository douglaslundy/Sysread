import { describe, expect, it } from "vitest";
import { apiError, correlationId } from "../src/lib/api-response";
import { AuthError } from "../src/modules/auth/application/errors";
import { authErrorResponse } from "../src/modules/auth/infrastructure/http";
import { rateLimitResponse } from "../src/modules/security/infrastructure/rate-limit";

describe("API error contract", () => {
  it("returns the correlation id in the body and response header", async () => {
    const request = new Request("https://read.test/api/test", {
      headers: { "x-correlation-id": "request_12345" },
    });
    const response = apiError(request, "INVALID_INPUT", "Check the input.", 400, { field: "title" });
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_INPUT",
        details: { field: "title" },
        message: "Check the input.",
        requestId: "request_12345",
      },
    });
    expect(response.headers.get("x-correlation-id")).toBe("request_12345");
  });

  it("rejects unsafe supplied identifiers and preserves the auth error contract", async () => {
    const request = new Request("https://read.test/api/test", {
      headers: { "x-correlation-id": "bad value" },
    });
    expect(correlationId(request)).toMatch(/^[0-9a-f-]{36}$/u);
    const response = authErrorResponse(new AuthError("UNAUTHENTICATED", 401, "Authentication is required."), request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toMatchObject({ code: "UNAUTHENTICATED", message: "Authentication is required." });
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("adds retry metadata to rate-limit errors", async () => {
    const request = new Request("https://read.test/api/test", {
      headers: { "x-correlation-id": "request_67890" },
    });
    const response = rateLimitResponse(request, 42);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED", requestId: "request_67890" },
    });
  });
});