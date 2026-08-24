"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Modal, Tabs } from "@/components/ui";
import { AuthRequiredActions } from "@/modules/auth/ui/auth-required-actions";

type JobState = {
  error?: { code: string; message: string };
  progress: number;
  state: "queued" | "processing" | "completed" | "failed";
  statusCode: string;
};

export function ImportDialog({ authenticated }: { authenticated: boolean }) {
  const t = useTranslations("Import");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendlyJobError = (code?: string) =>
    ({
      EPUB_EMPTY: t("epubEmpty"),
      EPUB_INVALID: t("epubInvalid"),
      EPUB_TOO_COMPLEX: t("epubTooComplex"),
      MOBI_EMPTY: t("mobiEmpty"),
      MOBI_INVALID: t("mobiInvalid"),
      MOBI_TOO_COMPLEX: t("mobiTooComplex"),
      PDF_EMPTY: t("pdfEmpty"),
      PDF_ENCRYPTED: t("pdfEncrypted"),
      STORAGE_READ_FAILED: t("storageUnavailable"),
    } as Record<string, string>)[code ?? ""] ??
    (["FETCH_BLOCKED", "FETCH_FAILED", "RESPONSE_TOO_LARGE", "UNSUPPORTED_CONTENT", "PARSE_FAILED"].includes(code ?? "")
      ? t("articleUnavailable")
      : t("processingError"));

  const friendlySubmitError = (code?: string, fallback?: string) => ({
    FILE_TOO_LARGE: t("fileTooLarge"),
    INVALID_FILE: t("invalidFile"),
    QUOTA_EXCEEDED: t("quotaExceeded"),
    STORAGE_UNAVAILABLE: t("storageUnavailable"),
  } as Record<string, string>)[code ?? ""] ?? fallback ?? t("submitError");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function poll(jobId: string) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (!response.ok) {
      setError(t("jobError"));
      return;
    }
    const payload = (await response.json()) as { job: JobState };
    setJob(payload.job);
    if (payload.job.state === "completed") {
      router.refresh();
      return;
    }
    if (payload.job.state === "failed") return;
    timer.current = setTimeout(() => void poll(jobId), 1000);
  }

  async function submitFile(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    await submit("/api/imports", { body, method: "POST" });
  }

  async function submitUrl(event: FormEvent) {
    event.preventDefault();
    await submit("/api/imports/url", {
      body: JSON.stringify({ url }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  }

  async function submit(endpoint: string, init: RequestInit) {
    setError("");
    setJob(null);
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, init);
      const payload = await response.json();
      if (!response.ok) throw new Error(friendlySubmitError(payload?.error?.code, payload?.error?.message));
      setJob({ progress: 0, state: "queued", statusCode: "QUEUED" });
      await poll(payload.jobId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  const status = job ? (
    <section aria-live="polite" className="import-status">
      <strong>{job.state === "completed" ? t("complete") : job.state === "failed" ? t("failed") : t("processing")}</strong>
      <progress max={100} value={job.progress}>{job.progress}%</progress>
      <small>{job.error ? friendlyJobError(job.error.code) : job.statusCode}</small>
    </section>
  ) : null;

  return (
    <>
      <button aria-label={t("open")} className="primary-button" onClick={() => setOpen(true)} type="button">
        {"\u2191"} {t("open")}
      </button>
      <Modal onClose={close} open={open} title={t("title")}>
        {!authenticated ? <AuthRequiredActions message={t("authRequired")} /> : (
          <>
            <Tabs
              ariaLabel={t("method")}
              items={[
                {
                  content: (
                    <form className="import-form" onSubmit={submitFile}>
                      <label>{t("fileLabel")}<input accept=".pdf,.epub,.mobi,application/pdf,application/epub+zip,application/x-mobipocket-ebook,application/vnd.amazon.mobi8-ebook" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" /></label>
                      <small>{t("fileHint")}</small>
                      <Button disabled={submitting || !file} type="submit">{t("submitFile")}</Button>
                    </form>
                  ),
                  label: t("fileTab"),
                  value: "file",
                },
                {
                  content: (
                    <form className="import-form" onSubmit={submitUrl}>
                      <label>{t("urlLabel")}<input onChange={(event) => setUrl(event.target.value)} placeholder="https://" required type="url" value={url} /></label>
                      <Button disabled={submitting || !url} type="submit">{t("submitUrl")}</Button>
                    </form>
                  ),
                  label: t("urlTab"),
                  value: "url",
                },
              ]}
            />
            {error ? <p role="alert">{error}</p> : null}
            {status}
          </>
        )}
      </Modal>
    </>
  );
}
