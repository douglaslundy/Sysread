"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ReadingPreferences } from "@/modules/settings/application/types";
import type { ReaderChapter } from "@/modules/reader/application/types";
import { blockDurationMs, blockOrp } from "../domain/pacing";
import { DriftCorrectedClock, boostedWpm } from "../domain/focus-clock";
import { fittedFocusFontSize, fittedLinearFontSize } from "../domain/responsive-fit";
import { groupTokens, tokenizeText } from "../domain/tokenizer";

export function FocusPlayer({ autoPlay = false, chapter, initialWordIndex, onCheckpoint, onClose, onComplete, settings }: {
  autoPlay?: boolean;
  chapter: ReaderChapter;
  initialWordIndex: number;
  onCheckpoint: (wordIndex: number) => Promise<void>;
  onClose: () => void;
  onComplete: () => void;
  settings: ReadingPreferences;
}) {
  const t = useTranslations("Focus");
  const blocks = useMemo(
    () => groupTokens(tokenizeText(chapter.text), settings.wordsPerBlock),
    [chapter.text, settings.wordsPerBlock],
  );
  const initialIndex = Math.max(0, blocks.findIndex((block) =>
    initialWordIndex >= block.wordIndex &&
    initialWordIndex < block.wordIndex + block.tokens.length
  ));
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const preferredFontSize = { small: 56, medium: 72, large: 88, "extra-large": 104 }[settings.fontSize];
  const [displayFontSize, setDisplayFontSize] = useState(preferredFontSize);
  const stageRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLSpanElement>(null);
  const pivotRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLSpanElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef(new DriftCorrectedClock(initialIndex, blocks.length));
  const startedAtRef = useRef(0);
  const indexRef = useRef(initialIndex);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const effectiveWpm = useCallback(() =>
    boostedWpm(
      settings.wpm,
      startedAtRef.current ? performance.now() - startedAtRef.current : 0,
      settings.boostMode,
    ), [settings.boostMode, settings.wpm]);

  const durationAt = useCallback((blockIndex: number) =>
    blockDurationMs(blocks[blockIndex], effectiveWpm()), [blocks, effectiveWpm]);

  useEffect(() => {
    if (!autoPlay || !blocks.length) return;
    const timer = window.setTimeout(() => {
      startedAtRef.current = performance.now();
      clockRef.current.play(startedAtRef.current, durationAt);
      setPlaying(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoPlay, blocks.length, durationAt]);

  const pause = useCallback(() => {
    clockRef.current.pause();
    setPlaying(false);
    const block = blocks[indexRef.current];
    if (block) void onCheckpoint(block.wordIndex);
  }, [blocks, onCheckpoint]);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
      return;
    }
    startedAtRef.current = performance.now();
    clockRef.current.play(startedAtRef.current, durationAt);
    setPlaying(true);
  }, [durationAt, pause, playing]);

  const seek = useCallback((direction: -1 | 1) => {
    const next = Math.min(Math.max(0, indexRef.current + direction), Math.max(0, blocks.length - 1));
    clockRef.current.seek(next);
    setIndex(next);
    setPlaying(false);
    const block = blocks[next];
    if (block) void onCheckpoint(block.wordIndex);
  }, [blocks, onCheckpoint]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const loop = (now: number) => {
      setElapsedMs(now - startedAtRef.current);
      const snapshot = clockRef.current.tick(now, durationAt);
      setIndex(snapshot.index);
      if (snapshot.state === "ended") {
        setPlaying(false);
        const block = blocks[snapshot.index];
        if (block) void onCheckpoint(block.wordIndex + block.tokens.length);
        onComplete();
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [blocks, durationAt, onCheckpoint, onComplete, playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(-1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        pause();
        onClose();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pause();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onClose, pause, seek, toggle]);

  const block = blocks[index];
  const orp = block ? blockOrp(block) : { after: "", before: "", pivot: "", pivotIndex: 0 };
  const percent = blocks.length ? ((index + 1) / blocks.length) * 100 : 0;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const motion = motionRef.current;
    const before = beforeRef.current;
    const pivot = pivotRef.current;
    const after = afterRef.current;
    if (!stage) return;
    const fit = () => {
      const availableWidth = Math.max(0, Math.min(1000, stage.clientWidth - 28));
      const next = settings.focusPresentation === "orp" && before && pivot && after
        ? fittedFocusFontSize({
            afterWidth: after.getBoundingClientRect().width,
            availableWidth,
            beforeWidth: before.getBoundingClientRect().width,
            currentSize: Number.parseFloat(getComputedStyle(before).fontSize) || preferredFontSize,
            pivotWidth: pivot.getBoundingClientRect().width,
            preferredMaximum: preferredFontSize,
          })
        : motion
          ? fittedLinearFontSize({
              availableWidth,
              currentSize: Number.parseFloat(getComputedStyle(motion).fontSize) || preferredFontSize,
              measuredWidth: motion.scrollWidth,
              preferredMaximum: preferredFontSize,
            })
          : preferredFontSize;
      setDisplayFontSize((current) => current === next ? current : next);
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(stage);
    window.addEventListener("resize", fit);
    return () => { observer?.disconnect(); window.removeEventListener("resize", fit); };
  }, [block?.text, orp.after, orp.before, orp.pivot, preferredFontSize, settings.focusPresentation]);

  const motionClass = settings.focusPresentation === "horizontal"
    ? settings.horizontalDirection === "right-to-left" ? "motion-right-to-left" : "motion-left-to-right"
    : settings.verticalDirection === "down" ? "motion-down" : "motion-up";
  const motionStyle = {
    "--focus-step-ms": Math.max(120, block ? blockDurationMs(block, settings.wpm) : 120) + "ms",
    fontSize: displayFontSize + "px",
  } as CSSProperties;

  return (
    <section aria-label={t("title")} className={`focus-player focus-font-${settings.fontFamily}`}>
      <header className="focus-context">
        <strong>{chapter.title}</strong>
        <div>
          <span>{boostedWpm(settings.wpm, elapsedMs, settings.boostMode)} WPM</span>
          <span>{index + 1} / {blocks.length}</span>
          <button onClick={() => { pause(); onClose(); }}>{t("close")}</button>
        </div>
      </header>
      <div aria-live="polite" className={`focus-stage ${settings.focusPresentation === "orp" ? "" : "focus-stage-motion"}`} ref={stageRef}>
        {settings.focusPresentation === "orp" ? (
          <>
            <p className="focus-neighbor">{blocks[index - 1]?.text ?? ""}</p>
            <div aria-label={block?.text ?? ""} className="focus-word" role="status" style={{ fontSize: displayFontSize + "px" }}>
              <span ref={beforeRef}>{orp.before}</span><strong ref={pivotRef}>{orp.pivot}</strong><span ref={afterRef}>{orp.after}</span>
            </div>
            <p className="focus-neighbor">{blocks[index + 1]?.text ?? ""}</p>
          </>
        ) : (
          <div aria-label={block?.text ?? ""} className={`focus-motion-word ${motionClass} ${playing ? "is-playing" : ""}`} key={index} ref={motionRef} role="status" style={motionStyle}>{block?.text ?? ""}</div>
        )}
      </div>
      <footer className="focus-controls">
        <button aria-label={t("previous")} onClick={() => seek(-1)}>{"<"}</button>
        <button aria-label={playing ? t("pause") : t("play")} onClick={toggle}>{playing ? t("pause") : t("play")}</button>
        <button aria-label={t("next")} onClick={() => seek(1)}>{">"}</button>
        <small>{t("keyboard")}</small>
      </footer>
      <div aria-hidden="true" className="focus-progress" style={{ width: percent + "%" }} />
    </section>
  );
}
