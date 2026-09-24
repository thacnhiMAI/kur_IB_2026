"use client";

import Link from "next/link";
import React from "react";
import { useMemo, useState } from "react";

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
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-400">
                {item.authors.length > 0 ? item.authors.join(", ") : "Неизвестный автор"}
                {item.year ? ` · ${item.year}` : ""}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">
                {item.title}
              </h2>
              {item.subtitle ? (
                <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
              ) : null}
              <p className="mt-3 text-slate-300">{item.description}</p>
              <Link
                href={`/books/${item.slug}`}
                className="mt-5 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200"
              >
                Перейти к книге
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
          По локальному поиску книги не найдены.
        </div>
      )}
    </div>
  );
}
