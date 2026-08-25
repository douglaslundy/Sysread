"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Skeleton } from "@/components/ui";
import { SummaryRequestDialog } from "@/modules/catalog/ui/summary-request-dialog";
import { AuthRequiredActions, requestAuthentication } from "@/modules/auth/ui/auth-required-actions";
import {
  catalogCategories,
  type CatalogCategory,
  type CatalogItem,
  type Page,
} from "@/modules/catalog/application/types";

type LoadState = {
  items: CatalogItem[];
  nextCursor: string | null;
  status: "loading" | "ready" | "error";
};

const initialState: LoadState = {
  items: [],
  nextCursor: null,
  status: "loading",
};

export function LibraryPreview({ authenticated }: { authenticated: boolean }) {
  const t = useTranslations("Library");
  const [personal, setPersonal] = useState<LoadState>(
    authenticated ? initialState : { ...initialState, status: "ready" },
  );
  const [summaries, setSummaries] = useState<LoadState>(initialState);
  const [category, setCategory] = useState<CatalogCategory | "">("");
  const [loadingMore, setLoadingMore] = useState(false);
  const summaryRequest = useRef(0);

  const loadPersonal = useCallback(async (cursor?: string) => {
    try {
      if (!cursor) {
        setPersonal({ items: [], nextCursor: null, status: "loading" });
      } else {
        setLoadingMore(true);
      }
      const query = cursor ? "?cursor=" + encodeURIComponent(cursor) : "";
      const response = await fetch("/api/library" + query);
      if (!response.ok) throw new Error("library load failed");
      const page = (await response.json()) as Page<CatalogItem>;
      setPersonal((current) => ({
        items: cursor ? [...current.items, ...page.items] : page.items,
        nextCursor: page.nextCursor,
        status: "ready",
      }));
    } catch {
      setPersonal((current) => ({ ...current, status: "error" }));
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const loadSummaries = useCallback(
    async (selectedCategory: CatalogCategory | "", cursor?: string) => {
      const requestId = ++summaryRequest.current;
      try {
        if (!cursor) {
          setSummaries({ items: [], nextCursor: null, status: "loading" });
        } else {
          setLoadingMore(true);
        }
        const params = new URLSearchParams();
        if (selectedCategory) params.set("category", selectedCategory);
        if (cursor) params.set("cursor", cursor);
        const query = params.size ? "?" + params.toString() : "";
        const response = await fetch("/api/summaries" + query);
        if (!response.ok) throw new Error("summary load failed");
        const page = (await response.json()) as Page<CatalogItem>;

        if (requestId !== summaryRequest.current) return;
        setSummaries((current) => ({
          items: cursor ? [...current.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          status: "ready",
        }));
      } catch {
        if (requestId === summaryRequest.current) {
          setSummaries((current) => ({ ...current, status: "error" }));
        }
      } finally {
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authenticated) return;

    let cancelled = false;
    void fetch("/api/library")
      .then(async (response) => {
        if (!response.ok) throw new Error("library load failed");
        const page = (await response.json()) as Page<CatalogItem>;
        if (!cancelled) {
          setPersonal({
            items: page.items,
            nextCursor: page.nextCursor,
            status: "ready",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPersonal((current) => ({ ...current, status: "error" }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  useEffect(() => {
    const requestId = ++summaryRequest.current;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const query = params.size ? "?" + params.toString() : "";

    void fetch("/api/summaries" + query)
      .then(async (response) => {
        if (!response.ok) throw new Error("summary load failed");
        const page = (await response.json()) as Page<CatalogItem>;
        if (requestId === summaryRequest.current) {
          setSummaries({
            items: page.items,
            nextCursor: page.nextCursor,
            status: "ready",
          });
        }
      })
      .catch(() => {
        if (requestId === summaryRequest.current) {
          setSummaries((current) => ({ ...current, status: "error" }));
        }
      });
  }, [category]);

  return (
    <section className="library-layout">
      <article className="personal-library" aria-labelledby="personal-title">
        <h1 id="personal-title">{t("personal")}</h1>
        {!authenticated ? (
          <div className="library-state"><AuthRequiredActions message={t("signInEmpty")} /></div>
        ) : personal.status === "loading" ? (
          <LibraryLoading label={t("loading")} count={1} />
        ) : personal.status === "error" ? (
          <LibraryError
            message={t("personalError")}
            retry={() => void loadPersonal()}
            retryLabel={t("retry")}
          />
        ) : personal.items.length === 0 ? (
          <LibraryState
            message={t("personalEmptyDescription")}
            title={t("personalEmptyTitle")}
          />
        ) : (
          <>
            <div className="personal-book-grid">
              {personal.items.map((item) => (
                <BookCard
                  authenticated={authenticated}
                  item={item}
                  key={item.id}
                  onDeleted={(id) => setPersonal((current) => ({
                    ...current,
                    items: current.items.filter((entry) => entry.id !== id),
                  }))}
                />
              ))}
            </div>
            {personal.nextCursor ? (
              <Button
                disabled={loadingMore}
                onClick={() => void loadPersonal(personal.nextCursor ?? undefined)}
              >
                {t("loadMore")}
              </Button>
            ) : null}
          </>
        )}
      </article>

      <article className="summary-library" aria-labelledby="summary-title">
        <div className="section-heading">
          <h1 id="summary-title">{t("summaries")}</h1>
          <label className="library-filter">
            <span className="sr-only">{t("filterLabel")}</span>
            <select
              aria-label={t("filterLabel")}
              onChange={(event) => {
                setSummaries({ ...initialState });
                setCategory(event.target.value as CatalogCategory | "");
              }}
              value={category}
            >
              <option value="">{t("filterAll")}</option>
              {catalogCategories.map((item) => (
                <option key={item} value={item}>
                  {t("category." + item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {summaries.status === "loading" ? (
          <LibraryLoading label={t("loading")} count={5} />
        ) : summaries.status === "error" ? (
          <LibraryError
            message={t("summariesError")}
            retry={() => void loadSummaries(category)}
            retryLabel={t("retry")}
          />
        ) : summaries.items.length === 0 ? (
          <LibraryState message={t("summariesEmpty")} />
        ) : (
          <>
            <div className="book-grid">
              {summaries.items.map((item) => (
                <BookCard authenticated={authenticated} item={item} key={item.id} />
              ))}
            </div>
            {summaries.nextCursor ? (
              <Button
                disabled={loadingMore}
                onClick={() =>
                  void loadSummaries(
                    category,
                    summaries.nextCursor ?? undefined,
                  )
                }
              >
                {t("loadMore")}
              </Button>
            ) : null}
          </>
        )}

        <SummaryRequestDialog authenticated={authenticated} />
      </article>
    </section>
  );
}

function BookCard({
  authenticated,
  item,
  onDeleted,
}: {
  authenticated: boolean;
  item: CatalogItem;
  onDeleted?: (id: string) => void;
}) {
  const t = useTranslations("Library");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const ready = item.processingStatus === "ready";
  const content = (
    <>
      {item.category ? <span className="category">{item.category}</span> : null}
      {item.coverUrl ? (
        <span
          aria-label={t("coverOf", { title: item.title })}
          className="book-cover"
          role="img"
          style={{ backgroundImage: `url(${JSON.stringify(item.coverUrl).slice(1, -1)})` }}
        />
      ) : <div className="book-spacer" />}
      <h2>{item.title}</h2>
      {item.author ? <p>{item.author}</p> : null}
      {!ready && item.kind === "personal" ? (
        <strong className={`book-status book-status-${item.processingStatus}`}>
          {t(`status.${item.processingStatus}`)}
        </strong>
      ) : null}
      {item.progressPercent !== undefined ? (
        <>
          <small>{Math.round(item.progressPercent)}%</small>
          <span
            aria-label={Math.round(item.progressPercent) + "%"}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={item.progressPercent}
            className="progress"
            role="progressbar"
            style={{
              background:
                "linear-gradient(90deg,var(--accent) " +
                item.progressPercent +
                "%,#333 " +
                item.progressPercent +
                "%)",
            }}
          />
        </>
      ) : null}
    </>
  );
  if (!authenticated) {
    return <button className="book-card" onClick={() => requestAuthentication("login", "/reader/" + item.id)} type="button">{content}</button>;
  }
  if (item.kind !== "personal") {
    return <Link className="book-card" href={"/reader/" + item.id}>{content}</Link>;
  }

  const remove = async () => {
    if (!window.confirm(t("deleteConfirm", { title: item.title }))) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      const response = await fetch(`/api/contents/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      onDeleted?.(item.id);
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="book-card">
      {ready ? <Link className="book-card-main" href={"/reader/" + item.id}>{content}</Link> : <div className="book-card-main">{content}</div>}
      <div className="book-card-actions">
        {ready ? <Link className="book-card-edit" href={"/reader/" + item.id + "?manage=1"}>{t("edit")}</Link> : null}
        <Button disabled={deleting} onClick={() => void remove()} size="small" variant="danger">{t("delete")}</Button>
      </div>
      {deleteError ? <small className="book-card-error" role="alert">{t("deleteError")}</small> : null}
    </div>
  );
}

function LibraryLoading({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <div className="book-grid" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="book-card" key={index} label={label} />
      ))}
    </div>
  );
}

function LibraryState({
  message,
  title,
}: {
  message: string;
  title?: string;
}) {
  return (
    <div className="library-state">
      {title ? <strong>{title}</strong> : null}
      <p>{message}</p>
    </div>
  );
}

function LibraryError({
  message,
  retry,
  retryLabel,
}: {
  message: string;
  retry: () => void;
  retryLabel: string;
}) {
  return (
    <div className="library-state" role="alert">
      <p>{message}</p>
      <Button onClick={retry}>{retryLabel}</Button>
    </div>
  );
}
