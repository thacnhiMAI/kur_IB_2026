import { describe, expect, it } from "vitest";

import { buildFallbackRecommendationResult } from "@/lib/recommendations/fallback";
import type { RecommendationContext } from "@/lib/recommendations/types";

const context: RecommendationContext = {
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
    },
    {
      bookId: "interest-1",
      title: "Sprint",
      eventType: "INTERESTED",
      genres: ["Продукт"],
      authors: ["Jake Knapp"]
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

describe("buildFallbackRecommendationResult", () => {
  it("ranks author and genre matches above generic popularity and excludes seen books", () => {
    const result = buildFallbackRecommendationResult(context, [
      {
        id: "candidate-1",
        title: "Новый взгляд на UX",
        authors: ["Don Norman"],
        genres: ["Дизайн"],
        ratingAverage: 4.6,
        ratingsCount: 1200
      },
      {
        id: "candidate-2",
        title: "Популярная книга",
        authors: ["Другой автор"],
        genres: ["Бизнес"],
        ratingAverage: 4.9,
        ratingsCount: 12000
      },
      {
        id: "finished-1",
        title: "Исключённая книга",
        authors: ["Isaac Asimov"],
        genres: ["Научная фантастика"],
        ratingAverage: 4.8,
        ratingsCount: 9000
      }
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].bookId).toBe("candidate-1");
    expect(result.items[0].badge).toBe("author-match");
    expect(result.items[0].score).toBeGreaterThan(result.items[1].score ?? 0);
    expect(result.summary).toContain("любимых авторов");
    expect(result.insights.highRatedThemes).toContain("Дизайн");
    expect(result.items.some((item) => item.bookId === "finished-1")).toBe(false);
  });
});
