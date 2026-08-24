"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const storageKey = "readcoach:audio:v1";
const tracks = [
  { id: "none", label: "none", src: "" },
  { id: "deep-focus", label: "deepFocus", src: "/audio/deep-focus.wav" },
  { id: "youtube", label: "youtube", src: "" },
] as const;

export function parseYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./u, "");
    let candidate = "";
    if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      candidate = url.searchParams.get("v") ?? "";
      if (!candidate) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) candidate = parts[1] ?? "";
      }
    }
    return /^[a-zA-Z0-9_-]{11}$/u.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function AmbientAudioPlayer() {
  const t = useTranslations("Audio");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);
  const youtubeCommandTimersRef = useRef<number[]>([]);
  const [trackId, setTrackId] = useState<(typeof tracks)[number]["id"]>("none");
  const [volume, setVolume] = useState(35);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeHistory, setYoutubeHistory] = useState<string[]>([]);
  const [showYoutubeVideo, setShowYoutubeVideo] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const youtubeVideoId = parseYouTubeVideoId(youtubeUrl);

  const rememberYouTubeUrl = (value: string) => {
    const videoId = parseYouTubeVideoId(value);
    if (!videoId) return;
    const normalizedUrl = value.trim();
    setYoutubeHistory((current) => [
      normalizedUrl,
      ...current.filter((savedUrl) => parseYouTubeVideoId(savedUrl) !== videoId),
    ]);
  };

  const sendYouTubeCommand = (func: "pauseVideo" | "playVideo" | "setVolume", args: number[] = [], retry = false) => {
    const command = () => youtubeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ args, event: "command", func }),
      "*",
    );
    command();
    if (retry) {
      youtubeCommandTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      youtubeCommandTimersRef.current = [150, 500].map((delay) => window.setTimeout(command, delay));
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as { showYoutubeVideo?: boolean; trackId?: string; volume?: number; youtubeHistory?: string[]; youtubeUrl?: string };
        if (tracks.some((track) => track.id === saved.trackId)) setTrackId(saved.trackId as typeof trackId);
        if (typeof saved.volume === "number") setVolume(Math.min(100, Math.max(0, saved.volume)));
        if (typeof saved.youtubeUrl === "string") setYoutubeUrl(saved.youtubeUrl);
        if (Array.isArray(saved.youtubeHistory)) {
          setYoutubeHistory(saved.youtubeHistory.filter((url): url is string => typeof url === "string" && Boolean(parseYouTubeVideoId(url))));
        } else if (typeof saved.youtubeUrl === "string" && parseYouTubeVideoId(saved.youtubeUrl)) {
          setYoutubeHistory([saved.youtubeUrl]);
        }
        if (typeof saved.showYoutubeVideo === "boolean") setShowYoutubeVideo(saved.showYoutubeVideo);
      } catch {
        localStorage.removeItem(storageKey);
      } finally {
        setHydrated(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify({ showYoutubeVideo, trackId, volume, youtubeHistory, youtubeUrl }));
    const audio = audioRef.current;
    if (audio) audio.volume = volume / 100;
    sendYouTubeCommand("setVolume", [volume]);
  }, [hydrated, showYoutubeVideo, trackId, volume, youtubeHistory, youtubeUrl]);

  useEffect(() => () => {
    audioRef.current?.pause();
    youtubeCommandTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const selected = tracks.find((track) => track.id === trackId) ?? tracks[0];

  const changeTrack = (next: typeof trackId) => {
    audioRef.current?.pause();
    sendYouTubeCommand("pauseVideo");
    setPlaying(false);
    if (next === "none") {
      setError("");
    }
    setTrackId(next);
  };

  const toggle = async () => {
    if (trackId === "none") return;
    setError("");
    if (trackId === "youtube") {
      if (!youtubeVideoId) {
        setError(t("youtubeInvalid"));
        return;
      }
      rememberYouTubeUrl(youtubeUrl);
      if (!playing) sendYouTubeCommand("setVolume", [volume], true);
      sendYouTubeCommand(playing ? "pauseVideo" : "playVideo", [], !playing);
      setPlaying(!playing);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError(t("blocked"));
    }
  };

  return (
    <section aria-label={t("title")} className="audio-player">
      <strong>{t("title")}</strong>
      <label>
        <span>{t("track")}</span>
        <select value={trackId} onChange={(event) => changeTrack(event.target.value as typeof trackId)}>
          {tracks.map((track) => <option key={track.id} value={track.id}>{t(track.label)}</option>)}
        </select>
      </label>
      {trackId === "youtube" ? (
        <>
          <label>
            <span>{t("youtubeUrl")}</span>
            <input
              aria-invalid={Boolean(youtubeUrl && !youtubeVideoId)}
              onBlur={() => {
                if (youtubeUrl && !youtubeVideoId) setError(t("youtubeInvalid"));
                else rememberYouTubeUrl(youtubeUrl);
              }}
              onChange={(event) => {
                const nextUrl = event.target.value;
                setYoutubeUrl(nextUrl);
                rememberYouTubeUrl(nextUrl);
                setPlaying(false);
                setError("");
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              value={youtubeUrl}
            />
          </label>
          {youtubeHistory.length ? (
            <label>
              <span>{t("youtubeHistory")}</span>
              <select
                aria-label={t("youtubeHistory")}
                onChange={(event) => {
                  const savedUrl = event.target.value;
                  if (!savedUrl) return;
                  sendYouTubeCommand("pauseVideo");
                  setPlaying(false);
                  setYoutubeUrl(savedUrl);
                  rememberYouTubeUrl(savedUrl);
                  setError("");
                }}
                value=""
              >
                <option value="">{t("youtubeHistoryPlaceholder")}</option>
                {youtubeHistory.map((savedUrl) => (
                  <option key={parseYouTubeVideoId(savedUrl) ?? savedUrl} value={savedUrl}>{savedUrl}</option>
                ))}
              </select>
            </label>
          ) : null}
          {youtubeVideoId ? (
            <>
              <button
                aria-checked={showYoutubeVideo}
                className="youtube-visibility-toggle"
                onClick={() => setShowYoutubeVideo((visible) => !visible)}
                role="switch"
                type="button"
              >
                {showYoutubeVideo ? t("hideVideo") : t("showVideo")}
              </button>
              <iframe
                allow="autoplay; encrypted-media; picture-in-picture"
                aria-hidden={!showYoutubeVideo}
                className={`youtube-audio-frame${showYoutubeVideo ? "" : " is-audio-only"}`}
                onLoad={() => sendYouTubeCommand("setVolume", [volume], true)}
                ref={youtubeRef}
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&playsinline=1&loop=1&playlist=${youtubeVideoId}&rel=0`}
                tabIndex={showYoutubeVideo ? 0 : -1}
                title={t("youtubePlayer")}
              />
            </>
          ) : null}
        </>
      ) : null}
      <label>
        <span>{t("volume", { value: volume })}</span>
        <input aria-label={t("volumeLabel")} max="100" min="0" onChange={(event) => {
          const nextVolume = Number(event.target.value);
          setVolume(nextVolume);
          if (trackId === "youtube") sendYouTubeCommand("setVolume", [nextVolume], true);
        }} type="range" value={volume} />
      </label>
      <button disabled={trackId === "none" || (trackId === "youtube" && !youtubeVideoId)} onClick={() => void toggle()}>{playing ? t("pause") : t("play")}</button>
      <audio key={selected.src} loop ref={audioRef} src={selected.src || undefined} />
      <small aria-live="polite" role={error ? "alert" : "status"}>{error}</small>
    </section>
  );
}

export const ambientAudioInternals = { parseYouTubeVideoId };
