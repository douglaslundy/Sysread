"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";

type Stage = "idle" | "prompt" | "form" | "saving" | "saved" | "error";

const MAX_EXCERPT_LENGTH = 8_000;

function closestAnchor(node: Node | null): string | undefined {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  return element?.closest<HTMLElement>("[data-reader-anchor]")?.dataset.readerAnchor;
}

export type SavedNoteExcerpt = { chapterId: string; excerpt: string; paragraphAnchor?: string; title: string };

export function SelectionNoteBubble({ chapterId, containerRef, contentId, onSaved }: {
  chapterId: string | null;
  containerRef: RefObject<HTMLElement | null>;
  contentId: string;
  onSaved?: (note: SavedNoteExcerpt) => void;
}) {
  const t = useTranslations("Notes");
  const [stage, setStage] = useState<Stage>("idle");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [excerpt, setExcerpt] = useState("");
  const [paragraphAnchor, setParagraphAnchor] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const stageRef = useRef<Stage>("idle");
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    function onSelectionRelease(event: MouseEvent | TouchEvent) {
      if (bubbleRef.current?.contains(event.target as Node)) return;
      if (stageRef.current === "form" || stageRef.current === "saving") return;
      const container = containerRef.current;
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!container || !selection || selection.isCollapsed || !text) {
        setStage((current) => (current === "prompt" ? "idle" : current));
        return;
      }
      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setStage((current) => (current === "prompt" ? "idle" : current));
        return;
      }
      const rect = typeof range.getBoundingClientRect === "function"
        ? range.getBoundingClientRect()
        : { left: 0, top: 0, width: 0 };
      setExcerpt(text.slice(0, MAX_EXCERPT_LENGTH));
      setParagraphAnchor(closestAnchor(range.startContainer));
      setPosition({ left: rect.left + rect.width / 2, top: rect.top });
      setTitle("");
      setStage("prompt");
    }
    document.addEventListener("mouseup", onSelectionRelease);
    document.addEventListener("touchend", onSelectionRelease);
    return () => {
      document.removeEventListener("mouseup", onSelectionRelease);
      document.removeEventListener("touchend", onSelectionRelease);
    };
  }, [containerRef]);

  const close = useCallback(() => setStage("idle"), []);

  async function save() {
    if (!chapterId || !title.trim()) return;
    setStage("saving");
    try {
      const response = await fetch("/api/notes", {
        body: JSON.stringify({ chapterId, contentId, excerpt, paragraphAnchor, title: title.trim() }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      window.getSelection()?.removeAllRanges();
      onSaved?.({ chapterId, excerpt, paragraphAnchor, title: title.trim() });
      setStage("saved");
      window.setTimeout(() => setStage((current) => (current === "saved" ? "idle" : current)), 2000);
    } catch {
      setStage("error");
    }
  }

  if (stage === "idle" || !chapterId) return null;

  return (
    <div className="selection-note-bubble" ref={bubbleRef} style={{ left: position.left, top: position.top }}>
      {stage === "prompt" ? (
        <button className="selection-note-trigger" onClick={() => setStage("form")} type="button">{t("saveNote")}</button>
      ) : null}
      {stage === "form" || stage === "saving" || stage === "error" ? (
        <form className="selection-note-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <blockquote>{excerpt}</blockquote>
          <label>
            {t("titleLabel")}
            <input
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              required
              value={title}
            />
          </label>
          {stage === "error" ? <p role="alert">{t("saveError")}</p> : null}
          <div className="selection-note-actions">
            <button disabled={stage === "saving" || !title.trim()} type="submit">{t("save")}</button>
            <button onClick={close} type="button">{t("cancel")}</button>
          </div>
        </form>
      ) : null}
      {stage === "saved" ? <p role="status">{t("saved")}</p> : null}
    </div>
  );
}
