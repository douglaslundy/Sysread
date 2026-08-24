import { describe, expect, it } from "vitest";
import { POST } from "../src/app/api/locale/route";

describe("locale preference endpoint", () => {
  it("rejects unsupported locales", async () => {
    const response = await POST(
      new Request("http://localhost/api/locale", {
        body: JSON.stringify({ locale: "fr" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("persists a supported locale in a cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/locale", {
        body: JSON.stringify({ locale: "en" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("NEXT_LOCALE=en");
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("marks the locale cookie secure when HTTPS is forwarded", async () => {
    const response = await POST(
      new Request("http://localhost/api/locale", {
        body: JSON.stringify({ locale: "en" }),
        headers: { "content-type": "application/json", "x-forwarded-proto": "https" },
        method: "POST",
      }),
    );

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
