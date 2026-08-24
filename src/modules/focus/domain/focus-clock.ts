export type ClockState = "paused" | "playing" | "ended";

export class DriftCorrectedClock {
  private deadline = 0;
  private state: ClockState = "paused";

  constructor(private index: number, private readonly total: number) {}

  play(now: number, durationAt: (index: number) => number) {
    if (this.index >= this.total - 1) this.index = Math.max(0, this.total - 1);
    this.deadline = now + durationAt(this.index);
    this.state = "playing";
  }

  pause() {
    if (this.state !== "ended") this.state = "paused";
  }

  seek(index: number) {
    this.index = Math.min(Math.max(0, index), Math.max(0, this.total - 1));
    this.state = "paused";
  }

  tick(now: number, durationAt: (index: number) => number) {
    if (this.state !== "playing") return this.snapshot();
    while (now >= this.deadline && this.index < this.total - 1) {
      this.index += 1;
      this.deadline += durationAt(this.index);
    }
    if (now >= this.deadline && this.index >= this.total - 1) this.state = "ended";
    return this.snapshot();
  }

  snapshot() {
    return { index: this.index, state: this.state };
  }
}

export function boostedWpm(baseWpm: number, elapsedMs: number, enabled: boolean) {
  if (!enabled) return Math.min(1000, Math.max(100, baseWpm));
  const increase = Math.min(0.3, (elapsedMs / 60_000) * 0.03);
  return Math.min(1000, Math.round(baseWpm * (1 + increase)));
}
