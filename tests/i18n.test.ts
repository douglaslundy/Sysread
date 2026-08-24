import { describe, expect, it } from "vitest";
import { defaultLocale, resolveLocale } from "../src/i18n/config";

describe("locale resolution", () => {
  it("uses Brazilian Portuguese by default", () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale);
    expect(resolveLocale("unsupported")).toBe("pt-BR");
  });

  it("accepts each supported locale", () => {
    expect(resolveLocale("pt-BR")).toBe("pt-BR");
    expect(resolveLocale("en")).toBe("en");
  });
});