"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import {
  advancePomodoro,
  configurePomodoro,
  createInitialPomodoro,
  finishPomodoro,
  formatPomodoroTime,
  markPomodoroElapsed,
  pausePomodoro,
  phaseDurationMs,
  pomodoroConfigLimits,
  remainingPomodoroMs,
  resetPomodoro,
  resumePomodoro,
  startPomodoro,
  type PomodoroConfig,
  type PomodoroState,
} from "../domain/pomodoro-cycle";
import { playPomodoroAlert, unlockPomodoroSound } from "../infrastructure/pomodoro-alert";
import { loadPomodoroState, pomodoroStorageKey, savePomodoroState } from "../infrastructure/pomodoro-storage";

export function PomodoroWidget() {
  const t = useTranslations("Pomodoro");
  const [pomodoro, setPomodoro] = useState(createInitialPomodoro);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSilenced, setAlertSilenced] = useState(false);
  const previousStatus = useRef(pomodoro.status);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const timestamp = Date.now();
      setPomodoro(loadPomodoroState(localStorage, timestamp));
      setNow(timestamp);
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePomodoroState(localStorage, pomodoro);
  }, [hydrated, pomodoro]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== pomodoroStorageKey) return;
      setPomodoro(loadPomodoroState(localStorage, Date.now()));
      setNow(Date.now());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (pomodoro.status !== "running") return;
    const update = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      setPomodoro((current) => markPomodoroElapsed(current, timestamp));
    };
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [pomodoro.status]);

  useEffect(() => {
    if (pomodoro.status === "awaiting" && previousStatus.current !== "awaiting") setAlertSilenced(false);
    previousStatus.current = pomodoro.status;
  }, [pomodoro.status]);

  useEffect(() => {
    if (pomodoro.status !== "awaiting" || !pomodoro.soundEnabled || alertSilenced) return;
    void playPomodoroAlert();
    const reminder = window.setInterval(() => void playPomodoroAlert(), 12_000);
    return () => window.clearInterval(reminder);
  }, [alertSilenced, pomodoro.soundEnabled, pomodoro.status]);

  const update = useCallback((operation: (current: PomodoroState, timestamp: number) => PomodoroState) => {
    const timestamp = Date.now();
    setNow(timestamp);
    setPomodoro((current) => operation(current, timestamp));
  }, []);

  const start = () => {
    if (pomodoro.soundEnabled) void unlockPomodoroSound();
    update(startPomodoro);
  };
  const resume = () => {
    if (pomodoro.soundEnabled) void unlockPomodoroSound();
    update(resumePomodoro);
  };
  const advance = () => update(advancePomodoro);
  const remaining = pomodoro.status === "idle"
    ? phaseDurationMs(pomodoro.config, "study")
    : remainingPomodoroMs(pomodoro, now);
  const phaseLabel = t(`phase.${pomodoro.phase}`);
  const active = !["idle", "completed"].includes(pomodoro.status);

  return (
    <aside className={`pomodoro-widget${expanded ? " is-expanded" : ""}${pomodoro.status === "awaiting" ? " is-alerting" : ""}`} aria-label={t("title")}>
      <div className="pomodoro-summary">
        <button aria-expanded={expanded} className="pomodoro-summary-copy" onClick={() => setExpanded((value) => !value)} type="button">
          <span>{pomodoro.status === "completed" ? t("status.completed") : phaseLabel}</span>
          <strong aria-label={t("remaining", { time: formatPomodoroTime(remaining) })} role="timer">{formatPomodoroTime(remaining)}</strong>
          <small>{t("block", { current: pomodoro.currentBlock, total: pomodoro.config.totalBlocks })}</small>
        </button>
        <div className="pomodoro-quick-actions">
          {pomodoro.status === "running" ? <Button aria-label={t("pause")} onClick={() => update(pausePomodoro)} size="small">Ⅱ</Button> : null}
          {pomodoro.status === "paused" ? <Button aria-label={t("resume")} onClick={resume} size="small" variant="primary">▶</Button> : null}
          {pomodoro.status === "idle" || pomodoro.status === "completed" ? <Button onClick={start} size="small" variant="primary">{t("start")}</Button> : null}
          {pomodoro.status === "awaiting" ? <Button onClick={advance} size="small" variant="primary">{t("confirm")}</Button> : null}
          <Button aria-label={expanded ? t("collapse") : t("expand")} onClick={() => setExpanded((value) => !value)} size="small" variant="ghost">{expanded ? "⌄" : "⌃"}</Button>
        </div>
      </div>

      {expanded ? (
        <div className="pomodoro-details">
          <p className="pomodoro-status" aria-live="polite">
            {pomodoro.status === "awaiting" ? t("stageEnded", { phase: phaseLabel }) : t(`status.${pomodoro.status}`)}
          </p>
          <div className="pomodoro-controls">
            {pomodoro.status === "running" ? <Button onClick={() => update(pausePomodoro)} size="small">{t("pause")}</Button> : null}
            {pomodoro.status === "paused" ? <Button onClick={resume} size="small" variant="primary">{t("resume")}</Button> : null}
            {pomodoro.status === "awaiting" ? <>
              <Button onClick={advance} size="small" variant="primary">{t("confirm")}</Button>
              <Button disabled={alertSilenced} onClick={() => setAlertSilenced(true)} size="small">{alertSilenced ? t("silenced") : t("silence")}</Button>
            </> : null}
            {active && pomodoro.status !== "awaiting" ? <Button onClick={advance} size="small" variant="ghost">{t("next")}</Button> : null}
            {active ? <Button onClick={() => setPomodoro((current) => resetPomodoro(current))} size="small">{t("restart")}</Button> : null}
            {active ? <Button onClick={() => setPomodoro((current) => finishPomodoro(current))} size="small" variant="danger">{t("finish")}</Button> : null}
            <Button onClick={() => setSettingsOpen(true)} size="small" variant="ghost">{t("settings")}</Button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? <PomodoroSettings
        active={active}
        config={pomodoro.config}
        onClose={() => setSettingsOpen(false)}
        onSave={(config, soundEnabled) => {
          if (soundEnabled) void unlockPomodoroSound();
          setPomodoro((current) => ({ ...configurePomodoro(current, config), soundEnabled }));
          setNow(Date.now());
          setSettingsOpen(false);
        }}
        soundEnabled={pomodoro.soundEnabled}
      /> : null}
    </aside>
  );
}

function PomodoroSettings({ active, config, onClose, onSave, soundEnabled }: {
  active: boolean;
  config: PomodoroConfig;
  onClose: () => void;
  onSave: (config: PomodoroConfig, soundEnabled: boolean) => void;
  soundEnabled: boolean;
}) {
  const t = useTranslations("Pomodoro");
  const [draft, setDraft] = useState(config);
  const [sound, setSound] = useState(soundEnabled);

  const field = (key: keyof PomodoroConfig, label: string) => (
    <label><span>{label}</span><input
      max={key === "longBreakEvery" ? Math.min(pomodoroConfigLimits[key].max, draft.totalBlocks) : pomodoroConfigLimits[key].max}
      min={pomodoroConfigLimits[key].min}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))}
      required
      type="number"
      value={draft[key]}
    /></label>
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft, sound);
  };

  return (
    <Modal description={t("settingsDescription")} onClose={onClose} open title={t("settingsTitle")}>
      <form className="pomodoro-settings" onSubmit={submit}>
        {active ? <p className="pomodoro-settings-warning">{t("settingsResetWarning")}</p> : null}
        <div className="pomodoro-settings-grid">
          {field("studyMinutes", t("studyMinutes"))}
          {field("shortBreakMinutes", t("shortBreakMinutes"))}
          {field("longBreakMinutes", t("longBreakMinutes"))}
          {field("totalBlocks", t("totalBlocks"))}
          {field("longBreakEvery", t("longBreakEvery"))}
        </div>
        <label className="pomodoro-sound-setting"><input checked={sound} onChange={(event) => setSound(event.target.checked)} type="checkbox" /> <span>{t("soundEnabled")}</span></label>
        <div className="pomodoro-settings-actions"><Button onClick={onClose}>{t("cancel")}</Button><Button type="submit" variant="primary">{t("save")}</Button></div>
      </form>
    </Modal>
  );
}
