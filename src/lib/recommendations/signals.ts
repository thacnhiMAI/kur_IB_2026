import { db } from "@/lib/db";

import type { RecommendationContext } from "@/lib/recommendations/types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function buildRecommendationContext(userId: string): Promise<RecommendationContext> {
  const [favorites, history, reviews] = await Promise.all([
    db.favorite.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            genres: { include: { genre: true } },
            authors: { include: { author: true } }
          }
        }
      }
    }),
    db.readingHistory.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            genres: { include: { genre: true } },
            authors: { include: { author: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    db.review.findMany({
      where: {
        userId,
        status: "PUBLISHED"
      },
      include: {
        book: {
          include: {
            genres: { include: { genre: true } },
            authors: { include: { author: true } }
          }
        }
      }
    })
  ]);

  const favoriteGenres = unique(
    favorites.flatMap((item) => item.book.genres.map((entry) => entry.genre.name))
  );
  const favoriteAuthors = unique(
    favorites.flatMap((item) => item.book.authors.map((entry) => entry.author.name))
  );

  return {
    userId,
    favoriteBooks: favorites.map((item) => ({
      bookId: item.bookId,
      title: item.book.title
    })),
    favoriteGenres,
    favoriteAuthors,
    readingSignals: history.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      eventType: item.eventType,
      genres: item.book.genres.map((entry) => entry.genre.name),
      authors: item.book.authors.map((entry) => entry.author.name)
    })),
    reviewedBooks: reviews.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      rating: item.rating,
      content: item.content,
      genres: item.book.genres.map((entry) => entry.genre.name),
      authors: item.book.authors.map((entry) => entry.author.name)
    })),
    excludedBookIds: unique([
      ...favorites.map((item) => item.bookId),
      ...history.filter((item) => item.eventType === "FINISHED").map((item) => item.bookId)
    ])
  };
}
