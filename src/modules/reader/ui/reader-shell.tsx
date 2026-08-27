"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import type { ReadingPreferences } from "@/modules/settings/application/types";
import { ReadingSettingsDialog } from "@/modules/settings/ui/reading-settings-dialog";
import { FocusPlayer } from "@/modules/focus/ui/focus-player";
import { nextFocusAdvance } from "@/modules/focus/domain/focus-navigation";
import { MagicReadingButton } from "@/modules/magic/ui/magic-reading-button";
import { AmbientAudioPlayer } from "@/modules/audio/ui/ambient-audio-player";
import { SelectionNoteBubble, type SavedNoteExcerpt } from "@/modules/notes/ui/selection-note-bubble";
import type { ReadingCheckpoint } from "../application/progress-types";
import type { ReaderChapter, ReaderChapterSummary, ReaderContent, TextVariant } from "../application/types";
import {
  applyHighlightRanges,
  excerptRange,
  paragraphAnchor,
  splitParagraphs,
  wordIndexAtOffset,
  wordIndexForParagraph,
  wordRangeOffsets,
  type HighlightRange,
  type ReaderFont,
  type ReaderFontSize,
} from "../domain/text-navigation";
import { useReadingProgress } from "./use-reading-progress";
import { ContentManagement } from "./content-management";

type ReaderState = {
  chapter: ReaderChapter | null;
  chapters: ReaderChapterSummary[];
  content: ReaderContent | null;
  error: "chapter" | "load" | "variant" | null;
  loading: boolean;
  notes: SavedNoteExcerpt[];
  progress: ReadingCheckpoint | null;
};

type ReadingPosition = { paragraphIndex: number; wordIndex: number };

const initialState: ReaderState = {
  chapter: null,
  chapters: [],
  content: null,
  error: null,
  loading: true,
  notes: [],
  progress: null,
};

async function readJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
    throw new Error(body?.error?.code ?? "READER_REQUEST_FAILED");
  }
  return response.json() as Promise<T>;
}

function chapterUrl(contentId: string, chapterId: string, variant: TextVariant) {
  return "/api/contents/" + contentId + "/chapters/" + chapterId + "?variant=" + variant;
}

export function ReaderShell({ contentId, initialManage = false }: { contentId: string; initialManage?: boolean }) {
  const t = useTranslations("Reader");
  const [state, setState] = useState(initialState);
  const [chaptersOpen, setChaptersOpen] = useState(true);
  const [focusOpen, setFocusOpen] = useState(true);
  const [font, setFont] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState<ReaderFontSize>("large");
  const [currentAnchor, setCurrentAnchor] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [focusParagraphIndex, setFocusParagraphIndex] = useState(0);
  const [focusAutoPlay, setFocusAutoPlay] = useState(false);
  const [focusCompletion, setFocusCompletion] = useState<"paragraph" | "text" | "">("");
  const [focusResume, setFocusResume] = useState<{ chapterId: string; paragraphIndex: number; wordIndex: number } | null>(null);
  const [focusSettings, setFocusSettings] = useState<ReadingPreferences>({
    autoAdvance: false, boostMode: false, focusPresentation: "orp", fontFamily: "serif",
    fontSize: "large", horizontalDirection: "left-to-right", navigationWordStep: 5, verticalDirection: "up", wordsPerBlock: 1, wpm: 350,
  });
  const applySettings = useCallback((settings: ReadingPreferences) => {
    setFocusSettings(settings);
    setFont(settings.fontFamily);
    setFontSize(settings.fontSize === "extra-large" ? "xlarge" : settings.fontSize);
  }, []);
  const [resumeAnchor, setResumeAnchor] = useState("");
  const [focusStartChoice, setFocusStartChoice] = useState<{ resume: ReadingPosition; selection: ReadingPosition } | null>(null);
  const proseRef = useRef<HTMLElement>(null);

  const paragraphs = useMemo(() => splitParagraphs(state.chapter?.text ?? ""), [state.chapter?.text]);
  const anchors = useMemo(
    () => paragraphs.map((paragraph, index) => paragraphAnchor(paragraph, index)),
    [paragraphs],
  );
  const currentParagraph = Math.max(0, anchors.indexOf(currentAnchor));
  // Prefers the live, in-session checkpoint (focusResume) over the value loaded
  // at page-open time, which never changes again — otherwise the highlighted
  // pause position stays stuck at whatever was true when the reader mounted.
  const pauseHighlight = useMemo((): ReadingPosition | null => {
    if (!state.chapter) return null;
    if (focusResume && focusResume.chapterId === state.chapter.id && paragraphs[focusResume.paragraphIndex] !== undefined) {
      return { paragraphIndex: focusResume.paragraphIndex, wordIndex: focusResume.wordIndex };
    }
    const saved = state.progress;
    if (
      !saved ||
      saved.chapterId !== state.chapter.id ||
      saved.textVersionHash !== state.chapter.textVersionHash ||
      saved.textVariant !== state.chapter.variant
    ) return null;
    const paragraphIndex = anchors.indexOf(saved.paragraphAnchor ?? "");
    if (paragraphIndex < 0) return null;
    const localWordIndex = saved.wordIndex - wordIndexForParagraph(paragraphs, paragraphIndex);
    if (localWordIndex < 0) return null;
    return { paragraphIndex, wordIndex: localWordIndex };
  }, [anchors, focusResume, paragraphs, state.chapter, state.progress]);
  const noteHighlightsByParagraph = useMemo(() => {
    const map = new Map<number, HighlightRange[]>();
    if (!state.chapter) return map;
    for (const note of state.notes) {
      if (note.chapterId !== state.chapter.id || !note.paragraphAnchor) continue;
      const paragraphIndex = anchors.indexOf(note.paragraphAnchor);
      if (paragraphIndex < 0) continue;
      const range = excerptRange(paragraphs[paragraphIndex] ?? "", note.excerpt);
      if (!range) continue;
      const list = map.get(paragraphIndex) ?? [];
      list.push({ className: "reader-note-highlight", end: range.end, start: range.start, title: note.title });
      map.set(paragraphIndex, list);
    }
    return map;
  }, [anchors, paragraphs, state.chapter, state.notes]);
  const captureSelectionPosition = useCallback((): ReadingPosition | null => {
    const container = proseRef.current;
    const selection = typeof window === "undefined" ? null : window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!container || !selection || selection.isCollapsed || !text) return null;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer)) return null;
    const startElement = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const paragraphElement = startElement?.closest<HTMLElement>("[data-reader-anchor]");
    if (!paragraphElement) return null;
    const paragraphIndex = anchors.indexOf(paragraphElement.dataset.readerAnchor ?? "");
    if (paragraphIndex < 0) return null;
    const measuring = document.createRange();
    measuring.selectNodeContents(paragraphElement);
    measuring.setEnd(range.startContainer, range.startOffset);
    const offset = measuring.toString().length;
    return { paragraphIndex, wordIndex: wordIndexAtOffset(paragraphs[paragraphIndex] ?? "", offset) };
  }, [anchors, paragraphs]);

  // Tracked separately from a synchronous read at click time: clicking "Start
  // reading" itself first triggers a mousedown outside the selected text,
  // which clears window.getSelection() before the click handler ever runs.
  const [selectionAnchor, setSelectionAnchor] = useState<ReadingPosition | null>(null);
  useEffect(() => {
    function onSelectionRelease(event: MouseEvent | TouchEvent) {
      const container = proseRef.current;
      if (!container || !container.contains(event.target as Node)) return;
      setSelectionAnchor(captureSelectionPosition());
    }
    document.addEventListener("mouseup", onSelectionRelease);
    document.addEventListener("touchend", onSelectionRelease);
    return () => {
      document.removeEventListener("mouseup", onSelectionRelease);
      document.removeEventListener("touchend", onSelectionRelease);
    };
  }, [captureSelectionPosition]);

  const progress = useReadingProgress({
    anchors,
    chapter: state.chapter,
    contentId,
    currentAnchor,
    initialProgress: state.progress,
    paragraphs,
  });

  const selectChapter = useCallback(async (chapterId: string, variant: TextVariant) => {
    await progress.flush();
    try {
      const result = await readJson<{ chapter: ReaderChapter }>(chapterUrl(contentId, chapterId, variant));
      setState((current) => ({ ...current, chapter: result.chapter, error: null }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error as Error).message === "VARIANT_NOT_READY" ? "variant" : "chapter",
      }));
    }
  }, [contentId, progress]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      readJson<{ content: ReaderContent }>("/api/contents/" + contentId, controller.signal),
      readJson<{ chapters: ReaderChapterSummary[] }>("/api/contents/" + contentId + "/chapters", controller.signal),
      readJson<{ progress: ReadingCheckpoint | null }>("/api/contents/" + contentId + "/progress", controller.signal),
      readJson<{ settings: ReadingPreferences }>("/api/me/reading-settings", controller.signal),
      readJson<{ notes: SavedNoteExcerpt[] }>("/api/notes?contentId=" + contentId, controller.signal).catch(() => ({ notes: [] })),
    ])
      .then(async ([contentResult, chapterResult, progressResult, settingsResult, notesResult]) => {
        applySettings(settingsResult.settings);
        const savedProgress = progressResult.progress;
        const first = chapterResult.chapters.find((item) => item.id === savedProgress?.chapterId) ?? chapterResult.chapters[0];
        const chapterResultBody = first
          ? await readJson<{ chapter: ReaderChapter }>(chapterUrl(contentId, first.id, savedProgress?.textVariant ?? "original"), controller.signal)
          : { chapter: null };
        const canResume = Boolean(
          savedProgress && chapterResultBody.chapter &&
          savedProgress.textVersionHash === chapterResultBody.chapter.textVersionHash,
        );
        setResumeAnchor(canResume ? savedProgress?.paragraphAnchor ?? "" : "");
        setState({
          chapter: chapterResultBody.chapter,
          chapters: chapterResult.chapters,
          content: contentResult.content,
          error: null,
          loading: false,
          notes: notesResult.notes,
          progress: savedProgress,
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          setState((current) => ({ ...current, error: "load", loading: false }));
        }
      });
    return () => controller.abort();
  }, [applySettings, contentId]);

  useEffect(() => {
    setCurrentAnchor((current) => current && anchors.includes(current) ? current : resumeAnchor && anchors.includes(resumeAnchor) ? resumeAnchor : anchors[0] ?? "");
    setResumeAnchor("");
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const anchor = (visible?.target as HTMLElement | undefined)?.dataset.readerAnchor;
        if (anchor) setCurrentAnchor(anchor);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.5, 1] },
    );
    const elements = document.querySelectorAll<HTMLElement>("[data-reader-anchor]");
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [anchors, resumeAnchor]);

  const chapterIndex = state.chapters.findIndex((item) => item.id === state.chapter?.id);
  const adjacentChapter = (direction: -1 | 1) => {
    const target = state.chapters[chapterIndex + direction];
    if (target) void selectChapter(target.id, state.chapter?.variant ?? "original");
  };

  const applyChapterEdit = (chapter: ReaderChapter) => {
    setState((current) => ({
      ...current,
      chapter,
      chapters: current.chapters.map((item) => item.id === chapter.id
        ? { id: chapter.id, order: chapter.order, title: chapter.title, wordCount: chapter.wordCount }
        : item),
      progress: null,
    }));
    setFocusResume(null);
    setCurrentAnchor("");
  };

  const applyChapterDelete = async (chapterId: string) => {
    const removedIndex = state.chapters.findIndex((item) => item.id === chapterId);
    const remaining = state.chapters.filter((item) => item.id !== chapterId);
    const target = remaining[Math.min(Math.max(0, removedIndex), remaining.length - 1)];
    setFocusResume(null);
    setCurrentAnchor("");
    if (!target) return;
    try {
      const result = await readJson<{ chapter: ReaderChapter }>(chapterUrl(contentId, target.id, "original"));
      setState((current) => ({ ...current, chapter: result.chapter, chapters: remaining, error: null, progress: null }));
    } catch {
      setState((current) => ({ ...current, chapters: remaining, error: "chapter", progress: null }));
    }
  };

  const focusChapter = state.chapter && paragraphs[focusParagraphIndex]
    ? { ...state.chapter, text: paragraphs[focusParagraphIndex], title: `${state.chapter.title} · ${focusParagraphIndex + 1}/${paragraphs.length}` }
    : null;

  const beginFocusAt = useCallback((paragraphIndex: number, wordIndex: number) => {
    if (!state.chapter) return;
    setFocusParagraphIndex(paragraphIndex);
    setFocusResume({ chapterId: state.chapter.id, paragraphIndex, wordIndex });
    setFocusAutoPlay(false);
    setFocusCompletion("");
    setFocusMode(true);
  }, [state.chapter]);

  const resumeWordIndexFor = useCallback((paragraphIndex: number): number => {
    if (!state.chapter) return 0;
    if (focusResume?.chapterId === state.chapter.id && focusResume.paragraphIndex === paragraphIndex) {
      return focusResume.wordIndex;
    }
    const savedProgress = state.progress;
    return savedProgress?.chapterId === state.chapter.id &&
      savedProgress.paragraphAnchor === anchors[paragraphIndex] &&
      savedProgress.textVersionHash === state.chapter.textVersionHash &&
      savedProgress.textVariant === state.chapter.variant
      ? Math.max(0, savedProgress.wordIndex - wordIndexForParagraph(paragraphs, paragraphIndex))
      : 0;
  }, [anchors, focusResume, paragraphs, state.chapter, state.progress]);

  const startFocus = () => {
    if (!state.chapter) return;
    const selection = selectionAnchor;
    setSelectionAnchor(null);
    if (selection && pauseHighlight) {
      setFocusStartChoice({ resume: pauseHighlight, selection });
      return;
    }
    if (selection) {
      beginFocusAt(selection.paragraphIndex, selection.wordIndex);
      return;
    }
    // Always continue from the true last reading position when one exists,
    // even if the reader has since scrolled to or clicked a different
    // paragraph — "Start reading" must resume the book, not the current view.
    if (pauseHighlight) {
      beginFocusAt(pauseHighlight.paragraphIndex, pauseHighlight.wordIndex);
      return;
    }
    beginFocusAt(currentParagraph, resumeWordIndexFor(currentParagraph));
  };

  const completeFocus = async () => {
    const advance = nextFocusAdvance({ chapterCount: state.chapters.length, chapterIndex, continuous: focusSettings.autoAdvance, paragraphCount: paragraphs.length, paragraphIndex: focusParagraphIndex });
    if (advance.type === "stop") {
      setFocusMode(false); setFocusAutoPlay(false); setFocusCompletion("paragraph");
      return;
    }
    if (advance.type === "paragraph") {
      const next = advance.paragraphIndex;
      if (state.chapter) setFocusResume({ chapterId: state.chapter.id, paragraphIndex: next, wordIndex: 0 });
      setFocusParagraphIndex(next); setCurrentAnchor(anchors[next] ?? ""); setFocusAutoPlay(true);
      return;
    }
    if (advance.type === "chapter") {
      const target = state.chapters[advance.chapterIndex];
      setFocusAutoPlay(false);
      await selectChapter(target.id, state.chapter?.variant ?? "original");
      setFocusResume({ chapterId: target.id, paragraphIndex: 0, wordIndex: 0 });
      setFocusParagraphIndex(0); setFocusAutoPlay(true);
      return;
    }
    setFocusMode(false); setFocusAutoPlay(false); setFocusCompletion("text");
  };

  if (state.loading) return <div className="reader-state" role="status">{t("loading")}</div>;
  if (state.error === "load" && !state.content) return <div className="reader-state" role="alert">{t("error")}</div>;

  return (
    <section className={"reader-layout" + (chaptersOpen ? "" : " chapters-collapsed") + (focusOpen ? "" : " focus-collapsed")}>
      <aside aria-label={t("chapters")} className="reader-chapters" id="reader-chapters">
        <button aria-controls="reader-chapter-list" aria-expanded={chaptersOpen} className="reader-collapse" onClick={() => setChaptersOpen((open) => !open)} title={chaptersOpen ? t("collapseChapters") : t("expandChapters")}>
          {chaptersOpen ? "<" : ">"}
        </button>
        {chaptersOpen ? (
          <div id="reader-chapter-list">
            <p className="reader-eyebrow">{t("chapters")}</p>
            <h1>{state.content?.title}</h1>
            <ol>
              {state.chapters.map((chapter) => (
                <li key={chapter.id}>
                  <button aria-current={state.chapter?.id === chapter.id ? "location" : undefined} onClick={() => void selectChapter(chapter.id, state.chapter?.variant ?? "original")}>
                    <span>{chapter.order + 1}</span><span className="reader-chapter-title">{chapter.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </aside>

      <main className="reader-content">
        <button className="reader-mobile-focus-action" disabled={!state.chapter} onClick={startFocus}>{t("focusAction")}</button>
        <header>
          <div>
            <p>{state.content?.author ?? t("unknownAuthor")}</p>
            <h2>{state.chapter?.title ?? t("empty")}</h2>
          </div>
          <div className="reader-position">
            <small>{state.chapter ? t("wordCount", { count: state.chapter.wordCount }) : null}</small>
            <small>{paragraphs.length ? t("paragraphPosition", { current: currentParagraph + 1, total: paragraphs.length }) : null}</small>
            <small aria-live="polite">{t("progress." + progress.status)}</small>
          </div>
        </header>

        <div className="reader-toolbar" aria-label={t("readingControls")}>
          <div className="reader-control-group" aria-label={t("version")}>
            {(["original", "simplified"] as const).map((variant) => (
              <button aria-pressed={state.chapter?.variant === variant} key={variant} onClick={() => state.chapter && void selectChapter(state.chapter.id, variant)}>
                {t(variant)}
              </button>
            ))}
          </div>
          <div className="reader-control-group" aria-label={t("font")}>
            {(["serif", "sans", "mono"] as const).map((item) => (
              <button aria-pressed={font === item} key={item} onClick={() => setFont(item)}>{t(item)}</button>
            ))}
          </div>
          <div className="reader-control-group" aria-label={t("fontSize")}>
            {(["small", "medium", "large", "xlarge"] as const).map((item) => (
              <button aria-label={t("size." + item)} aria-pressed={fontSize === item} key={item} onClick={() => setFontSize(item)}>{t("sizeShort." + item)}</button>
            ))}
          </div>
          {state.chapter ? (
            <MagicReadingButton
              chapterId={state.chapter.id}
              onReady={() => void selectChapter(state.chapter!.id, "simplified")}
            />
          ) : null}
          {state.content ? (
            <ReadingSettingsDialog
              allowCleanup={state.content.kind === "personal"}
              contentId={contentId}
              initialCleanup={state.content.cleanupLevel}
              onApply={applySettings}
            />
          ) : null}
          {state.content?.kind === "personal" && state.chapter?.variant === "original" ? (
            <ContentManagement
              chapter={state.chapter}
              contentId={contentId}
              initiallyOpen={initialManage}
              onChapterDeleted={applyChapterDelete}
              onUpdated={applyChapterEdit}
            />
          ) : null}
        </div>

        {state.error === "variant" ? <p className="reader-inline-error" role="alert">{t("variantUnavailable")}</p> : null}
        {state.error === "chapter" ? <p className="reader-inline-error" role="alert">{t("chapterError")}</p> : null}
        {focusCompletion ? <p className="reader-completion" role="status">{t(focusCompletion === "text" ? "readingComplete" : "paragraphComplete")}</p> : null}

        <article className={"reader-prose font-" + font + " size-" + fontSize} ref={proseRef}>
          {paragraphs.map((paragraph, index) => {
            const ranges: HighlightRange[] = [...(noteHighlightsByParagraph.get(index) ?? [])];
            if (pauseHighlight && pauseHighlight.paragraphIndex === index) {
              const pauseRange = wordRangeOffsets(paragraph, pauseHighlight.wordIndex, focusSettings.wordsPerBlock);
              if (pauseRange) ranges.push({ className: "reader-pause-highlight", end: pauseRange.end, start: pauseRange.start });
            }
            const segments = ranges.length ? applyHighlightRanges(paragraph, ranges) : null;
            return (
              <p
                aria-current={anchors[index] === currentAnchor ? "location" : undefined}
                data-reader-anchor={anchors[index]}
                id={anchors[index]}
                key={anchors[index]}
                onClick={() => setCurrentAnchor(anchors[index])}
                onFocus={() => setCurrentAnchor(anchors[index])}
                tabIndex={-1}
              >
                {segments
                  ? segments.map((segment, segmentIndex) => segment.className
                      ? <mark className={segment.className} key={segmentIndex} title={segment.title}>{segment.text}</mark>
                      : segment.text)
                  : paragraph}
              </p>
            );
          })}
        </article>
        <SelectionNoteBubble
          chapterId={state.chapter?.id ?? null}
          containerRef={proseRef}
          contentId={contentId}
          onSaved={(note) => setState((current) => ({ ...current, notes: [...current.notes, note] }))}
        />

        <nav aria-label={t("chapterNavigation")} className="reader-chapter-navigation">
          <button disabled={chapterIndex <= 0} onClick={() => adjacentChapter(-1)}>{t("previousChapter")}</button>
          <button disabled={chapterIndex < 0 || chapterIndex >= state.chapters.length - 1} onClick={() => adjacentChapter(1)}>{t("nextChapter")}</button>
        </nav>
      </main>

      <aside aria-label={t("focus")} className="reader-focus" id="reader-focus">
        <button aria-controls="reader-focus-body" aria-expanded={focusOpen} className="reader-collapse" onClick={() => setFocusOpen((open) => !open)} title={focusOpen ? t("collapseFocus") : t("expandFocus")}>
          {focusOpen ? ">" : "<"}
        </button>
        {focusOpen ? (
          <div id="reader-focus-body">
            <p className="reader-eyebrow">{t("focus")}</p>
            <div className="reader-focus-card">
              <strong>{t("focusTitle")}</strong>
              <p>{t("focusDescription")}</p>
              <button disabled={!state.chapter} onClick={startFocus}>{t("focusAction")}</button>
            </div>
            <AmbientAudioPlayer />
          </div>
        ) : null}
      </aside>
      {focusMode && focusChapter ? (
        <FocusPlayer
          autoPlay={focusAutoPlay}
          chapter={focusChapter}
          key={focusChapter.id + focusChapter.textVersionHash + focusParagraphIndex + focusSettings.wordsPerBlock}
          initialWordIndex={focusResume && focusResume.chapterId === state.chapter?.id && focusResume.paragraphIndex === focusParagraphIndex ? focusResume.wordIndex : 0}
          onCheckpoint={(wordIndex) => {
            setFocusResume(state.chapter ? { chapterId: state.chapter.id, paragraphIndex: focusParagraphIndex, wordIndex } : null);
            return progress.saveWordIndex(wordIndexForParagraph(paragraphs, focusParagraphIndex) + wordIndex);
          }}
          onClose={() => { setFocusAutoPlay(false); setFocusMode(false); }}
          onComplete={() => void completeFocus()}
          settings={focusSettings}
        />
      ) : null}
      {focusStartChoice ? (
        <Modal
          description={t("focusStartChoiceDescription")}
          onClose={() => setFocusStartChoice(null)}
          open
          title={t("focusStartChoiceTitle")}
        >
          <div className="focus-start-choice-actions">
            <Button
              onClick={() => {
                const target = focusStartChoice.selection;
                setFocusStartChoice(null);
                beginFocusAt(target.paragraphIndex, target.wordIndex);
              }}
            >
              {t("focusStartFromSelection")}
            </Button>
            <Button
              onClick={() => {
                const target = focusStartChoice.resume;
                setFocusStartChoice(null);
                beginFocusAt(target.paragraphIndex, target.wordIndex);
              }}
              variant="secondary"
            >
              {t("focusStartFromResume")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
