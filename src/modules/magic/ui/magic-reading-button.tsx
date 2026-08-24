"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "requesting" | "queued" | "failed";

export function MagicReadingButton(props: {
  chapterId: string;
  onReady: () => void;
}) {
  const t = useTranslations("Magic");
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const poll = async (jobId: string, attempt = 0): Promise<void> => {
    if (attempt >= 150) {
      setStatus("failed");
      return;
    }
    try {
      const response = await fetch("/api/jobs/" + jobId);
      const body = await response.json() as {
        job?: { state: "queued" | "processing" | "completed" | "failed" };
      };
      if (!response.ok || !body.job) throw new Error("JOB_FAILED");
      if (body.job.state === "completed") {
        setStatus("idle");
        props.onReady();
        return;
      }
      if (body.job.state === "failed") {
        setStatus("failed");
        return;
      }
      timerRef.current = setTimeout(() => void poll(jobId, attempt + 1), 800);
    } catch {
      setStatus("failed");
    }
  };

  const request = async () => {
    setStatus("requesting");
    try {
      const response = await fetch("/api/chapters/" + props.chapterId + "/simplifications", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as {
        jobId?: string;
        state?: "queued" | "processing" | "ready";
      };
      if (!response.ok || !body.state) throw new Error("REQUEST_FAILED");
      if (body.state === "ready") {
        setStatus("idle");
        props.onReady();
      } else if (body.jobId) {
        setStatus("queued");
        void poll(body.jobId);
      } else {
        throw new Error("MISSING_JOB");
      }
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="magic-reading-control">
      <button
        aria-describedby="magic-reading-status"
        disabled={status === "requesting" || status === "queued"}
        onClick={() => void request()}
      >
        <span aria-hidden="true" className="magic-badge">Sm</span>
        {t(status === "idle" ? "action" : status === "failed" ? "retry" : "working")}
      </button>
      <span aria-live="polite" id="magic-reading-status" role="status">
        {status === "queued" ? t("queued") : status === "failed" ? t("error") : ""}
      </span>
    </div>
  );
}
