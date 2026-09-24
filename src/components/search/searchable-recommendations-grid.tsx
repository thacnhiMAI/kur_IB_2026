"use client";

import React from "react";
import { useMemo, useState } from "react";

import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { UnifiedSearch } from "@/components/search/unified-search";
import { filterSearchItems } from "@/lib/search/filter";

type SearchableRecommendationItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  reason: string;
  badge?: string;
  score?: number | null;
  coverImage?: string | null;
  blurDataUrl?: string | null;
};

export function SearchableRecommendationsGrid({
  items
}: {
  items: SearchableRecommendationItem[];
}) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const searchableItems = items.map((item) => ({
      ...item,
      subtitle: item.subtitle ?? null,
      tags: item.badge ? [item.badge] : []
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
        placeholder="Поиск по названию, автору или причине рекомендации"
        onQueryChange={setQuery}
      />

      {filteredItems.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <RecommendationCard
              key={item.id}
              title={item.title}
              slug={item.slug}
              reason={item.reason}
              badge={item.badge}
              coverImage={item.coverImage}
              blurDataUrl={item.blurDataUrl}
              author={
                item.authors.length > 0
                  ? item.authors.join(", ")
                  : "Неизвестный автор"
              }
              score={item.score}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
          По локальному поиску рекомендации не найдены.
        </div>
      )}
    </div>
  );
}
