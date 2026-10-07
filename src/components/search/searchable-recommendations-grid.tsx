"use client";

import React, { useState } from "react";
import Link from "next/link";

import { RecommendationCard } from "@/components/recommendations/recommendation-card";

type SearchableRecommendationItem = {
  id: string;
  bookId: string;
  isFavorite: boolean;
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  reason: string;
  badge?: string;
  score?: number | null;
  ratingAverage?: number | null;
  coverImage?: string | null;
  blurDataUrl?: string | null;
};

export function SearchableRecommendationsGrid({ items }: { items: SearchableRecommendationItem[] }) {
  const [visible, setVisible] = useState(25);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-[var(--text-primary)]">Для вас</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{items.length} подходящих книг · рейтинг от высокого к низкому</p>
        </div>
        <Link href="/catalog" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-text)] hover:underline">
          Смотреть все <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {items.slice(0, visible).map((item) => (
          <div key={item.id} className="flex min-w-0 flex-col gap-2">
          <p className="shrink-0 text-sm font-semibold text-[var(--accent-text)]">★ {item.ratingAverage?.toFixed(2) ?? "Нет оценок"}</p>
          <RecommendationCard
            key={item.id}
            bookId={item.bookId}
            isFavorite={item.isFavorite}
            description={item.description}
            title={item.title}
            slug={item.slug}
            reason={item.reason}
            badge={item.badge}
            coverImage={item.coverImage}
            blurDataUrl={item.blurDataUrl}
            author={item.authors.length > 0 ? item.authors.join(", ") : "Неизвестный автор"}
            score={item.score}
          />
          </div>
        ))}
      </div>
      {visible < items.length && <button type="button" onClick={() => setVisible((count) => Math.min(count + 25, items.length))} className="concept-button-primary rounded-xl px-5 py-3">{items.length - visible < 25 ? `Показать ещё ${items.length - visible}` : `Показать ещё 25 · осталось ${items.length - visible}`}</button>}
    </section>
  );
}
