import React from "react";
import { RecommendationRefreshButton } from "@/components/recommendations/recommendation-refresh-button";

import { RecommendationHero } from "@/components/recommendations/recommendation-hero";
import { RecommendationInsightStrip } from "@/components/recommendations/recommendation-insight-strip";
import { RecommendationSource } from "@/components/recommendations/recommendation-source";
import { SearchableRecommendationsGrid } from "@/components/search/searchable-recommendations-grid";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  generateRecommendationsForUser,
  getLatestRecommendationSnapshot
} from "@/lib/recommendations/service";
import { buildPageMetadata } from "@/lib/site/metadata";
import { recommendationInsightsSchema } from "@/lib/recommendations/response-schema";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Рекомендации",
  description: "Персональные рекомендации на основе избранного, истории чтения и отзывов.",
  path: "/recommendations",
  noIndex: true
});

export default async function RecommendationsPage() {
  const user = await requireUser("/recommendations");
  const userId = user.id;

  async function refreshRecommendations() {
    "use server";
    const currentUser = await requireUser("/recommendations");
    await generateRecommendationsForUser(currentUser.id);
  }

  const [snapshot, favorites] = await Promise.all([
    getLatestRecommendationSnapshot(userId),
    db.favorite.findMany({ where: { userId }, select: { bookId: true } })
  ]);
  const favoriteBookIds = new Set(favorites.map((favorite) => favorite.bookId));
  const insights = recommendationInsightsSchema.safeParse(snapshot?.insights);

  return (
    <section className="space-y-9">
      <RecommendationHero
        summary={
          snapshot?.summary ??
          "Подборка собрана из любимых авторов, жанров и книг, которые вы уже завершили."
        }
      >
        <form action={refreshRecommendations}>
          <RecommendationRefreshButton />
        </form>
      </RecommendationHero>

      {snapshot && (
        <div className="space-y-1 text-sm text-[var(--text-secondary)]">
          <p>Обновлено: {snapshot.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} · {snapshot.items.length} книг.</p>
          <RecommendationSource provider={snapshot.provider} status={snapshot.status} strategy={snapshot.strategy} />
        </div>
      )}
      {insights.success && <RecommendationInsightStrip insights={insights.data} />}
      {snapshot?.items.length ? (
        <SearchableRecommendationsGrid
          items={snapshot.items.map((item) => ({
            id: item.id,
            bookId: item.book.id,
            isFavorite: favoriteBookIds.has(item.book.id),
            slug: item.book.slug,
            title: item.book.title,
            subtitle: null,
            authors: item.book.authors.map((entry) => entry.author.name),
            description: item.book.description ?? "",
            reason: item.reason,
            badge: item.badge ?? undefined,
            score: item.score,
            ratingAverage: item.book.ratingAverage,
            coverImage: item.book.coverAssets[0]?.publicUrl ?? item.book.coverImage,
            blurDataUrl: item.book.coverAssets[0]?.blurDataUrl ?? null
          }))}
        />
      ) : (
        <div className="recommendation-card-reference p-10 text-center text-[var(--text-secondary)]">
          {snapshot ? "Пока нет новых подходящих книг. Попробуйте другие жанры, добавьте книги в избранное или оставьте оценки." : "Нажмите кнопку выше, чтобы получить первую персональную подборку."}
        </div>
      )}
    </section>
  );
}
