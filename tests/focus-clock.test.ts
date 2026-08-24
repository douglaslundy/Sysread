import { describe, expect, it } from "vitest";
import { DriftCorrectedClock, boostedWpm } from "../src/modules/focus/domain/focus-clock";

describe("drift-corrected focus clock", () => {
  it("catches up against monotonic deadlines without timeout drift", () => {
    const clock = new DriftCorrectedClock(0, 5);
    clock.play(1000, () => 200);
    expect(clock.tick(1199, () => 200)).toEqual({ index: 0, state: "playing" });
    expect(clock.tick(1601, () => 200)).toEqual({ index: 3, state: "playing" });
    expect(clock.tick(2100, () => 200)).toEqual({ index: 4, state: "ended" });
  });

  it("boosts gradually with a cap and can be disabled", () => {
    expect(boostedWpm(400, 10 * 60_000, true)).toBe(520);
    expect(boostedWpm(900, 10 * 60_000, true)).toBe(1000);
    expect(boostedWpm(400, 10 * 60_000, false)).toBe(400);
  });
});
