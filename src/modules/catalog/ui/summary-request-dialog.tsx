"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { AuthRequiredActions } from "@/modules/auth/ui/auth-required-actions";

export function SummaryRequestDialog({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const t = useTranslations("Library");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "duplicate" | "error"
  >("idle");

  function close() {
    setOpen(false);
    setState("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setState("submitting");

    try {
      const response = await fetch("/api/summary-requests", {
        body: JSON.stringify({
          author: String(form.get("author") ?? ""),
          title: String(form.get("title") ?? ""),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (response.status === 409) {
        setState("duplicate");
        return;
      }
      if (!response.ok) throw new Error("request failed");
      formElement.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        className="request-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        {t("requestSummary")}
      </button>
      <Modal onClose={close} open={open} title={t("summaryRequestTitle")}>
        {!authenticated ? (
          <AuthRequiredActions message={t("requestAuthRequired")} />
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>
              <span>{t("requestedBookTitle")}</span>
              <input
                maxLength={500}
                minLength={2}
                name="title"
                required
              />
            </label>
            <label>
              <span>{t("requestedBookAuthor")}</span>
              <input
                maxLength={300}
                minLength={2}
                name="author"
                required
              />
            </label>
            {state === "success" ? (
              <p role="status">{t("requestSuccess")}</p>
            ) : null}
            {state === "duplicate" ? (
              <p role="alert">{t("requestDuplicate")}</p>
            ) : null}
            {state === "error" ? (
              <p role="alert">{t("requestError")}</p>
            ) : null}
            <Button
              disabled={state === "submitting"}
              type="submit"
              variant="primary"
            >
              {t("submitRequest")}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
