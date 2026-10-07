"use client";

import React, { useState, useTransition } from "react";

import type { ImportReport } from "@/lib/import/report";

const DEFAULT_IMPORT_QUERIES = ["design", "science fiction", "history", "business"];

function normalizeQueries(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((query) => query.trim())
    .filter(Boolean);
}

type ImportBooksFormProps = {
  defaultQueries?: string[];
};

export function ImportBooksForm({ defaultQueries = DEFAULT_IMPORT_QUERIES }: ImportBooksFormProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const queries = normalizeQueries(String(formData.get("queries") ?? ""));

    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/import-books", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ queries })
        });

        const payload = await response.json();

        if (!response.ok) {
          setReport(null);
          setError(typeof payload?.error === "string" ? payload.error : "Импорт завершился с ошибкой.");
          return;
        }

        setReport(payload as ImportReport);
      } catch (submitError) {
        setReport(null);
        setError(submitError instanceof Error ? submitError.message : "Импорт завершился с ошибкой.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-6"
      >
        <div className="space-y-2">
          <label htmlFor="import-queries" className="text-sm font-medium text-[var(--text-primary)]">
            Запросы для импорта
          </label>
          <textarea
            id="import-queries"
            name="queries"
            rows={6}
            defaultValue={defaultQueries.join("\n")}
            className="w-full rounded-lg border border-[var(--surface-border-strong)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
          />
          <p className="text-sm text-[var(--text-muted)]">
            Один запрос на строку. Можно смешивать жанры, темы и ключевые слова.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg concept-button-primary px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Импорт..." : "Запустить импорт"}
        </button>
      </form>

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-[var(--danger-text)]">
          {error}
        </div>
      ) : null}

      {report ? (
        <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-6" aria-live="polite">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Результат импорта</h2>
          <dl className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
            <div>
              <dt className="text-[var(--text-muted)]">Запросы</dt>
              <dd>{report.queries.join(", ") || "По умолчанию"}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Получено</dt>
              <dd>{report.totalFetched}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Добавлено</dt>
              <dd>{report.added}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Обновлено</dt>
              <dd>{report.updated}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Пропущено</dt>
              <dd>{report.skipped}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Ошибки обложек</dt>
              <dd>{report.coverFailures}</dd>
            </div>
          </dl>

          {report.providerFailures.length > 0 ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Ошибки провайдеров</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                {report.providerFailures.map((failure) => (
                  <li key={`${failure.provider}-${failure.message}`} className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                    {failure.provider}: {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
