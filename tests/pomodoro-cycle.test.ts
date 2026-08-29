import { describe, expect, it } from "vitest";
import {
  advancePomodoro,
  createInitialPomodoro,
  markPomodoroElapsed,
  pausePomodoro,
  remainingPomodoroMs,
  resumePomodoro,
  startPomodoro,
  validatePomodoroConfig,
} from "../src/modules/pomodoro/domain/pomodoro-cycle";
import { loadPomodoroState, pomodoroStorageKey } from "../src/modules/pomodoro/infrastructure/pomodoro-storage";

describe("Pomodoro cycle", () => {
  it("alternates study and breaks and uses a long break after the configured block", () => {
    let state = createInitialPomodoro({ studyMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, totalBlocks: 4, longBreakEvery: 4 });
    let now = 1_000;
    state = startPomodoro(state, now);

    for (let block = 1; block <= 4; block += 1) {
      now = state.endTime!;
      state = markPomodoroElapsed(state, now);
      expect(state.status).toBe("awaiting");
      state = advancePomodoro(state, now);
      expect(state.phase).toBe(block === 4 ? "longBreak" : "shortBreak");
      now = state.endTime!;
      state = markPomodoroElapsed(state, now);
      state = advancePomodoro(state, now);
      if (block < 4) {
        expect(state).toMatchObject({ currentBlock: block + 1, phase: "study", status: "running" });
      }
    }

    expect(state.status).toBe("completed");
  });

  it("pauses and resumes from the exact timestamp-derived remainder", () => {
    const started = startPomodoro(createInitialPomodoro(), 10_000);
    const paused = pausePomodoro(started, 70_000);
    expect(paused.status).toBe("paused");
    expect(paused.remainingMs).toBe(24 * 60_000);
    const resumed = resumePomodoro(paused, 500_000);
    expect(resumed.endTime).toBe(500_000 + 24 * 60_000);
    expect(remainingPomodoroMs(resumed, 560_000)).toBe(23 * 60_000);
  });

  it("rejects empty, fractional, negative and excessive configuration values", () => {
    const valid = { studyMinutes: 30, shortBreakMinutes: 5, longBreakMinutes: 20, totalBlocks: 8, longBreakEvery: 4 };
    expect(validatePomodoroConfig(valid)).toEqual(valid);
    expect(validatePomodoroConfig({ ...valid, studyMinutes: 0 })).toBeNull();
    expect(validatePomodoroConfig({ ...valid, totalBlocks: -1 })).toBeNull();
    expect(validatePomodoroConfig({ ...valid, longBreakEvery: 1.5 })).toBeNull();
    expect(validatePomodoroConfig({ ...valid, totalBlocks: 2, longBreakEvery: 4 })).toBeNull();
    expect(validatePomodoroConfig({ ...valid, studyMinutes: 181 })).toBeNull();
  });

  it("restores persisted timestamps and detects an elapsed stage", () => {
    const running = startPomodoro(createInitialPomodoro(), 1_000);
    const storage = {
      getItem: (key: string) => key === pomodoroStorageKey ? JSON.stringify(running) : null,
      removeItem: () => undefined,
    };
    expect(loadPomodoroState(storage, running.endTime! + 1)).toMatchObject({ phase: "study", status: "awaiting", remainingMs: 0 });
  });
});
