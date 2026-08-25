"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PublicationRequestRow } from "../application/publication-service";

export function PublicationHistory({ requests }: { requests: PublicationRequestRow[] }) {
  const t = useTranslations("Publication");
  return (
    <section className="submission-page">
      <header><h1>{t("myTitle")}</h1><p>{t("myDescription")}</p></header>
      {requests.length === 0 ? <div className="library-state"><p>{t("empty")}</p></div> : (
        <div className="submission-list">
          {requests.map((request) => (
            <article className="submission-card" key={request.id}>
              <div>
                <span className={`status-pill status-${request.status}`}>{t(`status.${request.status}`)}</span>
                <h2>{request.title}</h2>
                <small>{t("requestedAt", { date: new Date(request.requestedAt).toLocaleDateString() })}</small>
                <p>{t("processing", { status: request.processingStatus })}</p>
              </div>
              {request.justification ? <blockquote><strong>{t("justification")}</strong><p>{request.justification}</p></blockquote> : <p>{t("waitingJustification")}</p>}
              {request.status === "approved" && request.processingStatus === "ready" ? <Link className="ui-button ui-button-secondary ui-button-medium" href={`/reader/${request.contentId}`}>{t("openBook")}</Link> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
