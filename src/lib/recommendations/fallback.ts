import { buildRecommendationInsights } from "@/lib/recommendations/insights";
import { buildFallbackReason, buildFallbackSummary } from "@/lib/recommendations/reasons";
import type {
  RecommendationContext,
  RecommendationResult,
  RecommendationResultItem
} from "@/lib/recommendations/types";

import { rankPersonalizedBooks, type NeuralBook } from "@/lib/recommendations/neural";

export function rankFallbackRecommendations<T extends { score: number }>(items: T[]) {
  return [...items].sort((left, right) => right.score - left.score);
}

export function buildFallbackRecommendationResult(
  context: RecommendationContext,
  candidates: NeuralBook[]
): RecommendationResult {
  const ranked: RecommendationResultItem[] = rankPersonalizedBooks(context, candidates).map((candidate) => {
    const { reason, badge } = buildFallbackReason(context, candidate);
    return { bookId: candidate.id, reason, badge, score: candidate.personalScore };
  });

  return {
    summary: `${buildFallbackSummary(context)} Найдено ${ranked.length} подходящих книг; сортировка — по рейтингу от высокого к низкому.`,
    insights: buildRecommendationInsights(context),
    items: ranked
  };
}
