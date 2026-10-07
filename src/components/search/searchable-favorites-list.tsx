"use client";

import Link from "next/link";
import React from "react";
import { useMemo, useState } from "react";

import { ReadingProgressBar } from "@/components/books/reading-progress-bar";
import { UnifiedSearch } from "@/components/search/unified-search";
import { filterSearchItems } from "@/lib/search/filter";

type SearchableFavoriteItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  year?: number | null;
  progressPercent: number;
  canRead: boolean;
  hasInternalFile: boolean;
};

export function SearchableFavoritesList({
  items
}: {
  items: SearchableFavoriteItem[];
}) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const searchableItems = items.map((item) => ({
      ...item,
      subtitle: item.subtitle ?? null,
      tags: [],
      reason: ""
    }));
    const matchingIds = new Set(
      filterSearchItems(searchableItems, query).map((item) => item.id)
    );

    return items.filter((item) => matchingIds.has(item.id));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <UnifiedSearch
        label="Быстрый поиск"
        placeholder="Поиск по названию, автору или описанию"
        onQueryChange={setQuery}
      />

      {filteredItems.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="editorial-subtle-surface rounded-[28px] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.34)]"
            >
              <p className="text-sm text-[var(--text-secondary)]">
                {item.authors.length > 0 ? item.authors.join(", ") : "Неизвестный автор"}
                {item.year ? ` · ${item.year}` : ""}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50">
                <Link
                  href={`/books/${item.slug}`}
                  className="transition hover:text-[var(--accent-text)]"
                >
                  {item.title}
                </Link>
              </h2>
              {item.subtitle ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{item.subtitle}</p>
              ) : null}
              <p className="mt-4 leading-7 text-[var(--text-secondary)]">{item.description}</p>
              <div className="mt-6 space-y-4">
                {item.hasInternalFile ? <ReadingProgressBar percent={item.progressPercent} /> : null}
                {item.canRead ? (
                  <Link
                    href={`/read/books/${item.slug}`}
                    className="inline-flex text-sm font-medium text-[var(--accent-text)] hover:brightness-110"
                  >
                    Читать
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-[rgba(4,10,26,0.74)] p-10 text-center text-[var(--text-secondary)]">
          По локальному поиску книги не найдены.
        </div>
      )}
    </div>
  );
}
