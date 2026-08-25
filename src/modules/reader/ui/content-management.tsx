"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import type { ReaderChapter } from "../application/types";

export function ContentManagement({
  chapter,
  contentId,
  onUpdated,
}: {
  chapter: ReaderChapter;
  contentId: string;
  onUpdated: (chapter: ReaderChapter) => void;
}) {
  const t = useTranslations("Reader");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [text, setText] = useState(chapter.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const openEditor = () => {
    setTitle(chapter.title);
    setText(chapter.text);
    setError("");
    setSaved(false);
    setOpen(true);
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/contents/${encodeURIComponent(contentId)}/chapters/${encodeURIComponent(chapter.id)}`, {
        body: JSON.stringify({ text, title }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { chapter?: ReaderChapter } | null;
      if (!response.ok || !payload?.chapter) throw new Error("UPDATE_FAILED");
      onUpdated(payload.chapter);
      setSaved(true);
      setOpen(false);
    } catch {
      setError(t("contentSaveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("deleteContentConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/contents/${encodeURIComponent(contentId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      router.push("/");
      router.refresh();
    } catch {
      setError(t("contentDeleteError"));
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={openEditor} size="small">
        {t("manageContent")}
      </Button>
      {saved ? <small className="content-management-status" role="status">{t("contentSaved")}</small> : null}
      <Modal closeLabel={t("cancelEdit")} onClose={close} open={open} title={t("editContentTitle")}>
        <form className="content-editor" onSubmit={save}>
          <label>
            {t("chapterTitleLabel")}
            <input maxLength={500} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label>
            {t("chapterTextLabel")}
            <textarea maxLength={5_000_000} onChange={(event) => setText(event.target.value)} required rows={18} value={text} />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <div className="content-editor-actions">
            <Button disabled={busy} onClick={close}>{t("cancelEdit")}</Button>
            <Button disabled={busy || !title.trim() || !text.trim()} type="submit" variant="primary">{t("saveContent")}</Button>
          </div>
          <div className="content-editor-delete">
            <Button disabled={busy} onClick={() => void remove()} variant="danger">{t("deleteContent")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
