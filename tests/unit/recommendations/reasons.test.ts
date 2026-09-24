import { describe, expect, it } from "vitest";

import { buildRecommendationInsights } from "@/lib/recommendations/insights";
import {
  buildFallbackReason,
  buildFallbackSummary
} from "@/lib/recommendations/reasons";
import type { RecommendationContext } from "@/lib/recommendations/types";

const baseContext: RecommendationContext = {
  userId: "user-1",
  favoriteBooks: [{ bookId: "fav-1", title: "Дизайн привычных вещей" }],
  favoriteGenres: ["Дизайн"],
  favoriteAuthors: ["Don Norman"],
  readingSignals: [
    {
      bookId: "finished-1",
      title: "Основание",
      eventType: "FINISHED",
      genres: ["Научная фантастика"],
      authors: ["Isaac Asimov"]
    }
  ],
  reviewedBooks: [
    {
      bookId: "review-1",
      title: "Эмоциональный дизайн",
      rating: 5,
      content: "Очень сильная книга про UX.",
      genres: ["Дизайн", "UX"],
      authors: ["Don Norman"]
    }
  ],
  excludedBookIds: ["fav-1", "finished-1"]
};

describe("recommendation reason builders", () => {
  it("prefers favorite author explanations over broader matches", () => {
    const result = buildFallbackReason(baseContext, {
      authors: ["Don Norman"],
      genres: ["Дизайн"]
    });

    expect(result).toEqual({
      reason: "Рекомендуем книгу из-за совпадения с вашими любимыми авторами.",
      badge: "author-match"
    });
  });

  it("uses high-rated theme reasoning when only review signals overlap", () => {
    const result = buildFallbackReason(
      {
        ...baseContext,
        favoriteAuthors: [],
        favoriteGenres: [],
        readingSignals: []
      },
      {
        authors: ["Другой автор"],
        genres: ["UX"]
      }
    );

    expect(result.badge).toBe("high-rated-theme");
    expect(result.reason).toContain("оценивали особенно высоко");
  });

  it("builds summary and insights from the deterministic context", () => {
    expect(buildFallbackSummary(baseContext)).toContain("любимых авторов");

    expect(buildRecommendationInsights(baseContext)).toEqual({
      favoriteGenres: ["Дизайн"],
      favoriteAuthors: ["Don Norman"],
      finishedBooks: ["Основание"],
      highRatedThemes: ["Дизайн", "UX"]
    });
  });
});
