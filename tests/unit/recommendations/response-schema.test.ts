import { describe, expect, it } from "vitest";

import { recommendationEnrichmentSchema } from "@/lib/recommendations/response-schema";

describe("recommendationEnrichmentSchema", () => {
  it("accepts enriched summary, insights, and per-item explanations", () => {
    const parsed = recommendationEnrichmentSchema.parse({
      summary: "Подборка собрана из любимых жанров, завершённых книг и высоких оценок.",
      insights: {
        favoriteGenres: ["Дизайн", "Научная фантастика"],
        favoriteAuthors: ["Don Norman"],
        finishedBooks: ["Основание"],
        highRatedThemes: ["UX", "системное мышление"]
      },
      items: [
        {
          bookId: "book-1",
          reason: "Похожа на книги, которые вы завершили и оценили высоко.",
          badge: "finished-match"
        }
      ]
    });

    expect(parsed.items[0].badge).toBe("finished-match");
    expect(parsed.insights.favoriteGenres).toContain("Дизайн");
  });

  it("rejects too-short summaries or item reasons", () => {
    expect(() =>
      recommendationEnrichmentSchema.parse({
        summary: "Слишком мало",
        insights: {
          favoriteGenres: [],
          favoriteAuthors: [],
          finishedBooks: [],
          highRatedThemes: []
        },
        items: [{ bookId: "book-1", reason: "Коротко" }]
      })
    ).toThrow();
  });
});
