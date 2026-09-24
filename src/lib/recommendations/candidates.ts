import { db } from "@/lib/db";

export type RecommendationCandidate = {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  authors: string[];
  genres: string[];
  ratingAverage: number | null;
  ratingsCount: number | null;
};

export async function getRecommendationCandidates(): Promise<RecommendationCandidate[]> {
  const books = await db.book.findMany({
    where: { isPublished: true },
    include: {
      authors: { include: { author: true } },
      genres: { include: { genre: true } },
      coverAssets: {
        orderBy: { lastFetchedAt: "desc" },
        take: 1
      }
    }
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    slug: book.slug,
    coverImage: book.coverAssets[0]?.publicUrl ?? book.coverImage ?? null,
    authors: book.authors.map((entry) => entry.author.name),
    genres: book.genres.map((entry) => entry.genre.name),
    ratingAverage: book.ratingAverage,
    ratingsCount: book.ratingsCount
  }));
}
