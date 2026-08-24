import { describe, expect, it } from "vitest";
import { getServerEnv } from "../src/lib/env";

const validEnvironment = {
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "a-secure-test-secret-with-32-characters",
  MONGODB_URI: "mongodb://localhost:27017/readcoach",
  NODE_ENV: "test",
};

describe("server environment", () => {
  it("parses required values and normalizes empty optional secrets", () => {
    const env = getServerEnv({
      ...validEnvironment,
      MERCADOPAGO_ACCESS_TOKEN: "",
    });

    expect(env.MONGODB_URI).toBe(validEnvironment.MONGODB_URI);
    expect(env.MERCADOPAGO_ACCESS_TOKEN).toBeUndefined();
  });

  it("reports invalid field names without leaking values", () => {
    const leakedSecret = "short-secret";

    expect(() =>
      getServerEnv({
        AUTH_SECRET: leakedSecret,
        MONGODB_URI: "https://not-mongodb.example",
      }),
    ).toThrow("AUTH_SECRET, MONGODB_URI");

    try {
      getServerEnv({
        AUTH_SECRET: leakedSecret,
        MONGODB_URI: "https://not-mongodb.example",
      });
    } catch (error) {
      expect(String(error)).not.toContain(leakedSecret);
    }
  });
});