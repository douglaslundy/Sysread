import { describe, expect, it } from "vitest";
import { validateReleaseConfiguration } from "../scripts/release-validation.mjs";

const valid = {
  AI_API_KEY: "ai-key",
  ALERT_WEBHOOK_URL: "https://alerts.example.test/readcoach",
  APP_URL: "https://staging.example.test",
  AUTH_SECRET: "a".repeat(32),
  CONTENT_STORAGE_DIR: ".data/uploads",
  CONTENT_STORAGE_PROVIDER: "local",
  DEPLOY_TARGET: "persistent",
  MERCADOPAGO_ACCESS_TOKEN: "mp-token",
  MERCADOPAGO_ANNUAL_PLAN_ID: "annual-plan",
  MERCADOPAGO_WEEKLY_PLAN_ID: "weekly-plan",
  MERCADOPAGO_WEBHOOK_SECRET: "webhook-secret",
  MONGODB_URI: "mongodb://database.example.test/readcoach",
  RELEASE_STAGE: "staging",
};

const provisionalLegal = "Provisional legal text [REPLACE: OPERATOR] example.invalid";
const finalLegal = "Sysread Tecnologia Ltda privacy@readcoach.test Brazil";

describe("release configuration profiles", () => {
  it("allows provisional copy in staging while preserving all service gates", () => {
    const result = validateReleaseConfiguration({ env: valid, legalConfig: provisionalLegal });
    expect(result).toEqual({ backgroundExecution: "worker", errors: [], stage: "staging", target: "persistent" });
  });

  it("defers legal completion to the authenticated admin readiness checklist", () => {
    const result = validateReleaseConfiguration({
      env: { ...valid, RELEASE_STAGE: "production" },
      legalConfig: provisionalLegal,
    });
    expect(result.errors).toEqual([]);
  });

  it("requires HTTPS bootstrap and a strong auth secret", () => {
    const result = validateReleaseConfiguration({
      env: {
        ...valid,
        AI_API_KEY: "",
        APP_URL: "http://localhost:3000",
        AUTH_SECRET: "short",
        RELEASE_STAGE: "production",
      },
      legalConfig: finalLegal,
    });
    expect(result.errors.join(" ")).toContain("HTTPS");
    expect(result.errors.join(" ")).toContain("32 characters");
  });

  it("requires private object storage and cron authentication on Vercel", () => {
    const result = validateReleaseConfiguration({
      env: { ...valid, DEPLOY_TARGET: "vercel" },
      legalConfig: finalLegal,
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      "Vercel and split deployments require CONTENT_STORAGE_PROVIDER=s3.",
      "Vercel and split deployments require CONTENT_STORAGE_BUCKET.",
      "HTTP cron execution requires CRON_SECRET.",
    ]));
  });

  it("accepts a complete Vercel release profile", () => {
    const result = validateReleaseConfiguration({
      env: {
        ...valid,
        CONTENT_STORAGE_BUCKET: "readcoach-private",
        CONTENT_STORAGE_PROVIDER: "s3",
        CRON_SECRET: "c".repeat(32),
        DEPLOY_TARGET: "vercel",
      },
      legalConfig: finalLegal,
    });
    expect(result.errors).toEqual([]);
  });

  it("requires a strong cron secret for a standalone cPanel HTTP schedule", () => {
    const result = validateReleaseConfiguration({
      env: { ...valid, BACKGROUND_EXECUTION: "http-cron" },
      legalConfig: finalLegal,
    });
    expect(result.errors).toContain("HTTP cron execution requires CRON_SECRET.");
  });
  it("rejects unknown stages and deployment targets", () => {
    const result = validateReleaseConfiguration({
      env: { ...valid, DEPLOY_TARGET: "unknown", RELEASE_STAGE: "qa" },
      legalConfig: finalLegal,
    });
    expect(result.errors).toHaveLength(2);
  });
});
