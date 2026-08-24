"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderChapter } from "../application/types";
import type { ReadingCheckpoint } from "../application/progress-types";
import { wordIndexForParagraph } from "../domain/text-navigation";

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

export function useReadingProgress(input: {
  anchors: string[];
  chapter: ReaderChapter | null;
  contentId: string;
  currentAnchor: string;
  initialProgress: ReadingCheckpoint | null;
  paragraphs: string[];
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const revisionRef = useRef(input.initialProgress?.revision ?? 0);
  const latestWordRef = useRef<{ anchor: string; chapterId: string; wordIndex: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const latestRef = useRef(input);

  useEffect(() => {
    latestRef.current = input;
  }, [input]);

  useEffect(() => {
    revisionRef.current = input.initialProgress?.revision ?? 0;
  }, [input.initialProgress?.revision]);

  const persist = useCallback((keepalive = false, wordIndexOverride?: number) => {
    const snapshot = latestRef.current;
    if (!snapshot.chapter || !snapshot.currentAnchor) return Promise.resolve();
    const paragraphIndex = Math.max(0, snapshot.anchors.indexOf(snapshot.currentAnchor));
    const localWord = latestWordRef.current;
    const savedProgress = snapshot.initialProgress;
    const resumableWordIndex = localWord?.chapterId === snapshot.chapter.id && localWord.anchor === snapshot.currentAnchor
      ? localWord.wordIndex
      : savedProgress?.chapterId === snapshot.chapter.id &&
          savedProgress.paragraphAnchor === snapshot.currentAnchor &&
          savedProgress.textVersionHash === snapshot.chapter.textVersionHash &&
          savedProgress.textVariant === snapshot.chapter.variant
        ? savedProgress.wordIndex
        : wordIndexForParagraph(snapshot.paragraphs, paragraphIndex);
    const payload = {
      chapterId: snapshot.chapter.id,
      paragraphAnchor: snapshot.currentAnchor,
      revision: revisionRef.current,
      textVariant: snapshot.chapter.variant,
      textVersionHash: snapshot.chapter.textVersionHash,
      wordIndex: wordIndexOverride ?? resumableWordIndex,
    };

    const operation = queueRef.current.then(async () => {
      setStatus("saving");
      const response = await fetch("/api/contents/" + snapshot.contentId + "/progress", {
        body: JSON.stringify({ ...payload, revision: revisionRef.current }),
        headers: { "content-type": "application/json" },
        keepalive,
        method: "PUT",
      });
      if (response.status === 409) {
        setStatus("conflict");
        return;
      }
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const body = await response.json() as { progress: ReadingCheckpoint };
      revisionRef.current = body.progress.revision;
      setStatus("saved");
    }).catch(() => setStatus("error"));

    queueRef.current = operation;
    return operation;
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    return persist(true);
  }, [persist]);

  useEffect(() => {
    if (!input.chapter || !input.currentAnchor) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist();
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input.chapter, input.currentAnchor, persist]);

  useEffect(() => {
    const onPageHide = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  const saveWordIndex = useCallback((wordIndex: number) => {
    const snapshot = latestRef.current;
    if (snapshot.chapter && snapshot.currentAnchor) {
      latestWordRef.current = {
        anchor: snapshot.currentAnchor,
        chapterId: snapshot.chapter.id,
        wordIndex,
      };
    }
    return persist(true, wordIndex);
  }, [persist]);

  return { flush, saveWordIndex, status };
}
