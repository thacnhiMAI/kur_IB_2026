import React from "react";

import { RecommendationHero } from "@/components/recommendations/recommendation-hero";
import { RecommendationInsightStrip } from "@/components/recommendations/recommendation-insight-strip";
import { SearchableRecommendationsGrid } from "@/components/search/searchable-recommendations-grid";
import { requireUser } from "@/lib/auth";
import {
  generateRecommendationsForUser,
  getLatestRecommendationSnapshot
} from "@/lib/recommendations/service";
import type { RecommendationInsights } from "@/lib/recommendations/types";
import { buildPageMetadata } from "@/lib/site/metadata";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Рекомендации",
  description: "Персональные рекомендации на основе избранного, истории чтения и отзывов.",
  path: "/recommendations",
  noIndex: true
});

const EMPTY_INSIGHTS: RecommendationInsights = {
  favoriteGenres: [],
  favoriteAuthors: [],
  finishedBooks: [],
  highRatedThemes: []
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeInsights(value: unknown): RecommendationInsights {
  if (!value || typeof value !== "object") {
    return EMPTY_INSIGHTS;
  }

  const record = value as Record<string, unknown>;

  return {
    favoriteGenres: toStringArray(record.favoriteGenres),
    favoriteAuthors: toStringArray(record.favoriteAuthors),
    finishedBooks: toStringArray(record.finishedBooks),
    highRatedThemes: toStringArray(record.highRatedThemes)
  };
}

function formatSnapshotDate(value?: Date) {
  if (!value) {
    return "нет данных";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export default async function RecommendationsPage() {
  const user = await requireUser();

  async function refreshRecommendations() {
    "use server";
    await generateRecommendationsForUser(user.id);
  }

  const snapshot = await getLatestRecommendationSnapshot(user.id);
  const insights = normalizeInsights(snapshot?.insights);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <RecommendationHero
          summary={
            snapshot?.summary ??
            "Рекомендации ещё не сгенерированы. Соберём snapshot из избранного, истории чтения и оценок после первого обновления."
          }
          strategy={snapshot?.strategy ?? "fallback"}
          status={snapshot?.status ?? "ready"}
          provider={snapshot?.provider ?? "fallback"}
          updatedAt={formatSnapshotDate(snapshot?.createdAt)}
          itemsCount={snapshot?.items.length ?? 0}
        />
        <form action={refreshRecommendations}>
          <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
            Обновить рекомендации
          </button>
        </form>
      </div>

      <RecommendationInsightStrip insights={insights} />

      {snapshot?.items.length ? (
        <SearchableRecommendationsGrid
          items={snapshot.items.map((item) => ({
            id: item.id,
            slug: item.book.slug,
            title: item.book.title,
            subtitle: null,
            authors: item.book.authors.map((entry) => entry.author.name),
            description: "",
            reason: item.reason,
            badge: item.badge ?? undefined,
            score: item.score,
            coverImage: item.book.coverAssets[0]?.publicUrl ?? item.book.coverImage,
            blurDataUrl: item.book.coverAssets[0]?.blurDataUrl ?? null
          }))}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
          Нажмите кнопку выше, чтобы получить первую персональную подборку.
        </div>
      )}
    </section>
  );
}
