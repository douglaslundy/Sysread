"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, SegmentedControl, Slider, Tabs, Toggle } from "@/components/ui";
import { BillingPanel } from "@/modules/billing/ui/billing-panel";
import { ProfilePanel } from "@/modules/profile/ui/profile-panel";
import type { ReadingPreferences } from "../application/types";

type CleanupLevel = "disabled" | "light" | "standard";

const defaults: ReadingPreferences = {
  autoAdvance: false,
  boostMode: false,
  focusPresentation: "orp",
  fontFamily: "serif",
  fontSize: "large",
  horizontalDirection: "left-to-right",
  wordsPerBlock: 1,
  wpm: 350,
  verticalDirection: "up",
};

export function ReadingSettingsDialog({ allowCleanup, contentId, initialCleanup, onApply }: {
  allowCleanup: boolean;
  contentId: string;
  initialCleanup: CleanupLevel;
  onApply: (settings: ReadingPreferences) => void;
}) {
  const t = useTranslations("ReadingSettings");
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [cleanup, setCleanup] = useState<CleanupLevel>(initialCleanup);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/me/reading-settings")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as { settings: ReadingPreferences };
        setSettings(body.settings);
        onApply(body.settings);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [open, onApply]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      const settingsResponse = await fetch("/api/me/reading-settings", {
        body: JSON.stringify(settings),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!settingsResponse.ok) throw new Error();
      const body = await settingsResponse.json() as { settings: ReadingPreferences };
      if (allowCleanup && cleanup !== initialCleanup) {
        const cleanupResponse = await fetch("/api/contents/" + contentId + "/cleanup", {
          body: JSON.stringify({ level: cleanup }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });
        if (!cleanupResponse.ok) throw new Error();
      }
      setSettings(body.settings);
      onApply(body.settings);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const reading = (
    <form className="reader-settings-form" onSubmit={save}>
      <Slider
        formatValue={(value) => value + " WPM"}
        label={t("wpm")}
        max={1000}
        min={100}
        onChange={(event) => setSettings((current) => ({ ...current, wpm: Number(event.target.value) }))}
        step={10}
        value={settings.wpm}
      />
      <Toggle checked={settings.boostMode} description={t("boostDescription")} label={t("boost")} onCheckedChange={(boostMode) => setSettings((current) => ({ ...current, boostMode }))} />
      <fieldset>
        <legend>{t("focusPresentation")}</legend>
        <SegmentedControl ariaLabel={t("focusPresentation")} onValueChange={(value) => setSettings((current) => ({ ...current, focusPresentation: value as ReadingPreferences["focusPresentation"] }))} options={["orp", "vertical", "horizontal"].map((value) => ({ label: t("presentationOption." + value), value }))} value={settings.focusPresentation} />
        <small>{t("focusPresentationDescription")}</small>
      </fieldset>
      {settings.focusPresentation === "horizontal" ? (
        <Toggle
          checked={settings.horizontalDirection === "right-to-left"}
          description={t(settings.horizontalDirection === "right-to-left" ? "horizontalCurrentRtl" : "horizontalCurrentLtr")}
          label={t("horizontalDirection")}
          onCheckedChange={(reversed) => setSettings((current) => ({ ...current, horizontalDirection: reversed ? "right-to-left" : "left-to-right" }))}
        />
      ) : null}
      {settings.focusPresentation === "vertical" ? (
        <Toggle
          checked={settings.verticalDirection === "up"}
          description={t(settings.verticalDirection === "up" ? "verticalCurrentUp" : "verticalCurrentDown")}
          label={t("verticalDirection")}
          onCheckedChange={(upward) => setSettings((current) => ({ ...current, verticalDirection: upward ? "up" : "down" }))}
        />
      ) : null}
      <fieldset>
        <legend>{t("readingMode")}</legend>
        <SegmentedControl ariaLabel={t("readingMode")} onValueChange={(value) => setSettings((current) => ({ ...current, autoAdvance: value === "continuous" }))} options={[{ label: t("paragraphMode"), value: "paragraph" }, { label: t("continuousMode"), value: "continuous" }]} value={settings.autoAdvance ? "continuous" : "paragraph"} />
        <small>{t("readingModeDescription")}</small>
      </fieldset>
      <fieldset>
        <legend>{t("wordsPerBlock")}</legend>
        <SegmentedControl ariaLabel={t("wordsPerBlock")} onValueChange={(value) => setSettings((current) => ({ ...current, wordsPerBlock: Number(value) as 1 | 2 | 3 }))} options={[1, 2, 3].map((value) => ({ label: String(value), value: String(value) }))} value={String(settings.wordsPerBlock)} />
      </fieldset>
      {allowCleanup ? (
        <fieldset>
          <legend>{t("cleanup")}</legend>
          <SegmentedControl ariaLabel={t("cleanup")} onValueChange={(value) => setCleanup(value as CleanupLevel)} options={["disabled", "light", "standard"].map((value) => ({ label: t("cleanupOption." + value), value }))} value={cleanup} />
        </fieldset>
      ) : null}
      <fieldset>
        <legend>{t("font")}</legend>
        <SegmentedControl ariaLabel={t("font")} onValueChange={(value) => setSettings((current) => ({ ...current, fontFamily: value as ReadingPreferences["fontFamily"] }))} options={["serif", "sans", "mono"].map((value) => ({ label: t("fontOption." + value), value }))} value={settings.fontFamily} />
      </fieldset>
      <fieldset>
        <legend>{t("fontSize")}</legend>
        <SegmentedControl ariaLabel={t("fontSize")} onValueChange={(value) => setSettings((current) => ({ ...current, fontSize: value as ReadingPreferences["fontSize"] }))} options={["small", "medium", "large", "extra-large"].map((value) => ({ label: t("sizeOption." + value), value }))} value={settings.fontSize} />
      </fieldset>
      <div className="reader-settings-actions">
        <span aria-live="polite">{status === "saved" ? t("saved") : status === "error" ? t("error") : ""}</span>
        <Button disabled={status === "loading" || status === "saving"} type="submit">{status === "saving" ? t("saving") : t("save")}</Button>
      </div>
    </form>
  );

  return (
    <>
      <Button onClick={() => { setStatus("loading"); setOpen(true); }} size="small" variant="secondary">{t("open")}</Button>
      <Modal closeLabel={t("close")} onClose={close} open={open} title={t("title")}>
        <div className="reading-settings-tabs">
          <Tabs
          ariaLabel={t("tabs")}
          items={[
            { content: reading, label: t("readingTab"), value: "reading" },
            { content: <ProfilePanel onAccountDeleted={() => { close(); window.location.reload(); }} />, label: t("profileTab"), value: "profile" },
            { content: <BillingPanel />, label: t("billingTab"), value: "billing" },
          ]}
          />
        </div>
      </Modal>
    </>
  );
}
