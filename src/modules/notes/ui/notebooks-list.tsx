"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { NoteRow } from "../application/note-service";

type NotebookGroup = { author?: string; contentId: string; notes: NoteRow[]; title: string };

function groupByBook(notes: NoteRow[]): NotebookGroup[] {
  const groups = new Map<string, NotebookGroup>();
  for (const note of notes) {
    const group = groups.get(note.contentId) ?? { author: note.contentAuthor, contentId: note.contentId, notes: [], title: note.contentTitle };
    group.notes.push(note);
    groups.set(note.contentId, group);
  }
  return Array.from(groups.values());
}

export function NotebooksList({ initialNotes }: { initialNotes: NoteRow[] }) {
  const t = useTranslations("Notes");
  const [notes, setNotes] = useState(initialNotes);

  async function remove(noteId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const response = await fetch("/api/notes/" + noteId, { method: "DELETE" });
    if (response.ok) setNotes((current) => current.filter((note) => note.id !== noteId));
  }

  return (
    <section className="submission-page">
      <header><h1>{t("myTitle")}</h1><p>{t("myDescription")}</p></header>
      {notes.length === 0 ? <div className="library-state"><p>{t("empty")}</p></div> : (
        <div className="notebook-groups">
          {groupByBook(notes).map((group) => (
            <article className="notebook-group" key={group.contentId}>
              <header>
                <h2>{group.title}</h2>
                <Link className="ui-button ui-button-secondary ui-button-small" href={"/reader/" + group.contentId}>{t("openBook")}</Link>
              </header>
              <div className="notebook-cards">
                {group.notes.map((note) => (
                  <article className="notebook-card" key={note.id}>
                    <h3>{note.title}</h3>
                    <blockquote>{note.excerpt}</blockquote>
                    <div className="notebook-card-footer">
                      <small>{t("savedAt", { date: new Date(note.createdAt).toLocaleDateString() })}</small>
                      <button onClick={() => void remove(note.id)} type="button">{t("deleteNote")}</button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
