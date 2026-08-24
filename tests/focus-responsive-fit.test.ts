import { describe, expect, it } from "vitest";
import { fittedFocusFontSize, fittedLinearFontSize } from "../src/modules/focus/domain/responsive-fit";

describe("responsive Focus typography", () => {
  it("uses the preferred size when the complete ORP block fits", () => {
    expect(fittedFocusFontSize({ afterWidth: 100, availableWidth: 360, beforeWidth: 90, currentSize: 88, pivotWidth: 30, preferredMaximum: 88 })).toBe(88);
  });

  it("shrinks unequal ORP sides until all three words fit one line", () => {
    const size = fittedFocusFontSize({ afterWidth: 340, availableWidth: 360, beforeWidth: 210, currentSize: 88, pivotWidth: 42, preferredMaximum: 88 });
    expect(size).toBeLessThan(44);
    expect(size).toBeGreaterThanOrEqual(10);
  });

  it("fits moving blocks within the available mobile width", () => {
    expect(fittedLinearFontSize({ availableWidth: 360, currentSize: 88, measuredWidth: 720, preferredMaximum: 88 })).toBe(44);
  });
});
