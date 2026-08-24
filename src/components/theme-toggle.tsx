"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

type Theme = "dark" | "light";
type ThemePreference = "system" | Theme;

export function ThemeToggle({ initialTheme }: { initialTheme: ThemePreference }) {
  const t = useTranslations("Theme");
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [isSaving, setIsSaving] = useState(false);

  async function toggleTheme() {
    if (isSaving) return;
    const previous = theme;
    const current = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
      : theme;
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    setIsSaving(true);
    document.documentElement.dataset.theme = next;

    try {
      const response = await fetch("/api/theme", {
        body: JSON.stringify({ theme: next }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("theme update failed");
    } catch {
      setTheme(previous);
      document.documentElement.dataset.theme = previous;
    } finally {
      setIsSaving(false);
    }
  }

  const label = theme === "system" ? t("toggle") : theme === "dark" ? t("useLight") : t("useDark");

  return (
    <button
      aria-label={label}
      className="theme-toggle"
      disabled={isSaving}
      onClick={() => void toggleTheme()}
      title={label}
      type="button"
    >
      <span aria-hidden="true">{theme === "system" ? "◐" : theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
