import { beforeEach, describe, expect, it, vi } from "vitest";

const { favoriteFindMany, historyFindMany, reviewFindMany } = vi.hoisted(() => ({
  favoriteFindMany: vi.fn(),
  historyFindMany: vi.fn(),
  reviewFindMany: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    favorite: { findMany: favoriteFindMany },
    readingHistory: { findMany: historyFindMany },
    review: { findMany: reviewFindMany },
    readingProgress: { findMany: vi.fn().mockResolvedValue([]) }
  }
}));

import { buildRecommendationContext } from "@/lib/recommendations/signals";

describe("buildRecommendationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects favorites, reading history, reviews, and exclusions into one context", async () => {
    favoriteFindMany.mockResolvedValue([
      {
        bookId: "book-fav",
        book: {
          title: "Дизайн привычных вещей",
          genres: [{ genre: { name: "Дизайн" } }],
          authors: [{ author: { name: "Don Norman" } }]
        }
      }
    ]);
    historyFindMany.mockResolvedValue([
      {
        bookId: "book-finished",
        eventType: "FINISHED",
        createdAt: new Date("2026-09-24T12:00:00Z"),
        book: {
          title: "Основание",
          genres: [{ genre: { name: "Научная фантастика" } }],
          authors: [{ author: { name: "Isaac Asimov" } }]
        }
      }
    ]);
    reviewFindMany.mockResolvedValue([
      {
        bookId: "book-reviewed",
        rating: 5,
        content: "Очень сильная книга про UX.",
        book: {
          title: "Эмоциональный дизайн",
          genres: [{ genre: { name: "UX" } }],
          authors: [{ author: { name: "Don Norman" } }]
        }
      }
    ]);

    const context = await buildRecommendationContext("user-1");

    expect(favoriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" }
      })
    );
    expect(historyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" }
      })
    );
    expect(reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: { in: ["PUBLISHED", "PENDING"] } }
      })
    );
    expect(context.favoriteBooks).toEqual([
      {
        bookId: "book-fav",
        title: "Дизайн привычных вещей",
        genres: ["Дизайн"],
        authors: ["Don Norman"]
      }
    ]);
    expect(context.favoriteAuthors).toEqual(["Don Norman"]);
    expect(context.favoriteGenres).toEqual(["Дизайн"]);
    expect(context.readingSignals[0].eventType).toBe("FINISHED");
    expect(context.readingSignals[0].genres).toEqual(["Научная фантастика"]);
    expect(context.reviewedBooks[0].rating).toBe(5);
    expect(context.excludedBookIds).toEqual(["book-fav", "book-finished", "book-reviewed"]);
  });
});
