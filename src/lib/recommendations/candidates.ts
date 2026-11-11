import { getBookCoverAsset } from "@/lib/books/image-source";
import { db } from "@/lib/db";

export type RecommendationCandidate = {
  id: string;
  title: string;
  description?: string;
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
    description: book.description,
    slug: book.slug,
    coverImage: getBookCoverAsset(book)?.publicUrl ?? book.coverImage,
    authors: book.authors.map((entry) => entry.author.name),
    genres: book.genres.map((entry) => entry.genre.name),
    ratingAverage: book.ratingAverage,
    ratingsCount: book.ratingsCount
  }));
}
