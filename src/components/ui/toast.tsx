"use client";

import { Button } from "./button";

export type ToastMessage = {
  description?: string;
  id: string;
  title: string;
  tone?: "neutral" | "success" | "error";
};

type ToastRegionProps = {
  dismissLabel?: string;
  label: string;
  onDismiss?: (id: string) => void;
  toasts: readonly ToastMessage[];
};

export function ToastRegion({
  dismissLabel = "Dismiss",
  label,
  onDismiss,
  toasts,
}: ToastRegionProps) {
  return (
    <section aria-label={label} className="ui-toast-region">
      {toasts.map((toast) => (
        <div
          aria-label={toast.title}
          className={"ui-toast ui-toast-" + (toast.tone ?? "neutral")}
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <div>
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </div>
          {onDismiss ? (
            <Button
              aria-label={dismissLabel}
              onClick={() => onDismiss(toast.id)}
              size="small"
              variant="ghost"
            >
              {"\u00d7"}
            </Button>
          ) : null}
        </div>
      ))}
    </section>
  );
}