"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { locales, type AppLocale } from "@/i18n/config";

export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const t = useTranslations("Locale");
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function changeLocale(locale: AppLocale) {
    if (locale === currentLocale || isSaving) return;

    setIsSaving(true);
    setHasError(false);

    try {
      const response = await fetch("/api/locale", {
        body: JSON.stringify({ locale }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok) throw new Error("locale update failed");
      router.refresh();
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="locale-switcher" aria-label={t("label")}>
      {locales.map((locale) => (
        <button
          aria-pressed={locale === currentLocale}
          className={locale === currentLocale ? "active" : ""}
          disabled={isSaving}
          key={locale}
          onClick={() => void changeLocale(locale)}
          type="button"
        >
          {t(locale)}
        </button>
      ))}
      {hasError ? <span role="alert">{t("changeError")}</span> : null}
    </div>
  );
}