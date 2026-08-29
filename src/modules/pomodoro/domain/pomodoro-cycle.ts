export type PomodoroPhase = "study" | "shortBreak" | "longBreak";
export type PomodoroStatus = "idle" | "running" | "paused" | "awaiting" | "completed";

export type PomodoroConfig = {
  longBreakEvery: number;
  longBreakMinutes: number;
  shortBreakMinutes: number;
  studyMinutes: number;
  totalBlocks: number;
};

export type PomodoroState = {
  config: PomodoroConfig;
  currentBlock: number;
  endTime: number | null;
  phase: PomodoroPhase;
  remainingMs: number;
  soundEnabled: boolean;
  status: PomodoroStatus;
  version: 1;
};

export const defaultPomodoroConfig: PomodoroConfig = {
  longBreakEvery: 4,
  longBreakMinutes: 15,
  shortBreakMinutes: 5,
  studyMinutes: 25,
  totalBlocks: 4,
};

export const pomodoroConfigLimits: Record<keyof PomodoroConfig, { max: number; min: number }> = {
  longBreakEvery: { max: 24, min: 1 },
  longBreakMinutes: { max: 120, min: 1 },
  shortBreakMinutes: { max: 60, min: 1 },
  studyMinutes: { max: 180, min: 1 },
  totalBlocks: { max: 24, min: 1 },
};

export function validatePomodoroConfig(input: PomodoroConfig): PomodoroConfig | null {
  const entries = Object.entries(input) as Array<[keyof PomodoroConfig, number]>;
  if (entries.some(([key, value]) => !Number.isInteger(value) || value < pomodoroConfigLimits[key].min || value > pomodoroConfigLimits[key].max)) return null;
  if (input.longBreakEvery > input.totalBlocks) return null;
  return { ...input };
}

export function createInitialPomodoro(config = defaultPomodoroConfig): PomodoroState {
  return {
    config: validatePomodoroConfig(config) ?? defaultPomodoroConfig,
    currentBlock: 1,
    endTime: null,
    phase: "study",
    remainingMs: 0,
    soundEnabled: true,
    status: "idle",
    version: 1,
  };
}

export function phaseDurationMs(config: PomodoroConfig, phase: PomodoroPhase) {
  const minutes = phase === "study" ? config.studyMinutes : phase === "shortBreak" ? config.shortBreakMinutes : config.longBreakMinutes;
  return minutes * 60_000;
}

function runningPhase(state: PomodoroState, phase: PomodoroPhase, currentBlock: number, now: number): PomodoroState {
  const remainingMs = phaseDurationMs(state.config, phase);
  return { ...state, currentBlock, endTime: now + remainingMs, phase, remainingMs, status: "running" };
}

export function startPomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.status === "paused") return resumePomodoro(state, now);
  if (state.status !== "idle" && state.status !== "completed") return state;
  return runningPhase({ ...state, currentBlock: 1, phase: "study" }, "study", 1, now);
}

export function remainingPomodoroMs(state: PomodoroState, now: number) {
  return state.status === "running" && state.endTime !== null ? Math.max(0, state.endTime - now) : Math.max(0, state.remainingMs);
}

export function markPomodoroElapsed(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== "running" || state.endTime === null || state.endTime > now) return state;
  return { ...state, endTime: null, remainingMs: 0, status: "awaiting" };
}

export function pausePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== "running") return state;
  return { ...state, endTime: null, remainingMs: remainingPomodoroMs(state, now), status: "paused" };
}

export function resumePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== "paused") return state;
  const remainingMs = Math.max(1, state.remainingMs);
  return { ...state, endTime: now + remainingMs, remainingMs, status: "running" };
}

export function advancePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.status === "idle" || state.status === "completed") return state;
  if (state.phase === "study") {
    const breakPhase: PomodoroPhase = state.currentBlock % state.config.longBreakEvery === 0 ? "longBreak" : "shortBreak";
    return runningPhase(state, breakPhase, state.currentBlock, now);
  }
  if (state.currentBlock >= state.config.totalBlocks) {
    return { ...state, endTime: null, remainingMs: 0, status: "completed" };
  }
  return runningPhase(state, "study", state.currentBlock + 1, now);
}

export function resetPomodoro(state: PomodoroState): PomodoroState {
  return { ...createInitialPomodoro(state.config), soundEnabled: state.soundEnabled };
}

export function finishPomodoro(state: PomodoroState): PomodoroState {
  return { ...state, endTime: null, remainingMs: 0, status: "completed" };
}

export function configurePomodoro(state: PomodoroState, config: PomodoroConfig): PomodoroState {
  const valid = validatePomodoroConfig(config);
  return valid ? { ...createInitialPomodoro(valid), soundEnabled: state.soundEnabled } : state;
}

export function formatPomodoroTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
