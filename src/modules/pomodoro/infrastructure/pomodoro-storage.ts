import {
  createInitialPomodoro,
  markPomodoroElapsed,
  validatePomodoroConfig,
  type PomodoroState,
} from "../domain/pomodoro-cycle";

export const pomodoroStorageKey = "readcoach:pomodoro:v1";

export function loadPomodoroState(storage: Pick<Storage, "getItem" | "removeItem">, now: number): PomodoroState {
  try {
    const parsed = JSON.parse(storage.getItem(pomodoroStorageKey) ?? "null") as Partial<PomodoroState> | null;
    if (!parsed || parsed.version !== 1 || !parsed.config || !validatePomodoroConfig(parsed.config)) return createInitialPomodoro();
    if (!["study", "shortBreak", "longBreak"].includes(parsed.phase ?? "")) return createInitialPomodoro(parsed.config);
    if (!["idle", "running", "paused", "awaiting", "completed"].includes(parsed.status ?? "")) return createInitialPomodoro(parsed.config);
    const state: PomodoroState = {
      config: parsed.config,
      currentBlock: Math.min(parsed.config.totalBlocks, Math.max(1, Math.trunc(parsed.currentBlock ?? 1))),
      endTime: typeof parsed.endTime === "number" ? parsed.endTime : null,
      phase: parsed.phase as PomodoroState["phase"],
      remainingMs: typeof parsed.remainingMs === "number" ? Math.max(0, parsed.remainingMs) : 0,
      soundEnabled: parsed.soundEnabled !== false,
      status: parsed.status as PomodoroState["status"],
      version: 1,
    };
    if (state.status === "running" && state.endTime === null) return { ...state, status: "paused" };
    return markPomodoroElapsed(state, now);
  } catch {
    storage.removeItem(pomodoroStorageKey);
    return createInitialPomodoro();
  }
}

export function savePomodoroState(storage: Pick<Storage, "setItem">, state: PomodoroState) {
  storage.setItem(pomodoroStorageKey, JSON.stringify(state));
}
