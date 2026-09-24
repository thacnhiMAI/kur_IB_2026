import type { RecommendationContext, RecommendationInsights } from "@/lib/recommendations/types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildRecommendationInsights(context: RecommendationContext): RecommendationInsights {
  return {
    favoriteGenres: context.favoriteGenres.slice(0, 4),
    favoriteAuthors: context.favoriteAuthors.slice(0, 4),
    finishedBooks: context.readingSignals
      .filter((signal) => signal.eventType === "FINISHED")
      .map((signal) => signal.title)
      .slice(0, 4),
    highRatedThemes: unique(
      context.reviewedBooks
        .filter((review) => review.rating >= 4)
        .flatMap((review) => review.genres)
    ).slice(0, 4)
  };
}
