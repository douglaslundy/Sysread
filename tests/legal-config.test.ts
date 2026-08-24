import { describe, expect, it } from "vitest";
import { legalDraftNotice, legalIdentity } from "../src/config/legal";

describe("provisional legal identity", () => {
  it("keeps all temporary identity values centralized and unmistakable", () => {
    expect(legalIdentity.operatorName).toContain("REPLACE:");
    expect(legalIdentity.governingLaw).toContain("REPLACE:");
    expect(legalIdentity.venue).toContain("REPLACE:");
    expect(legalIdentity.privacyEmail.endsWith(".invalid")).toBe(true);
    expect(legalIdentity.supportEmail.endsWith(".invalid")).toBe(true);
    expect(legalDraftNotice).toContain("Provisional legal text");
  });
});