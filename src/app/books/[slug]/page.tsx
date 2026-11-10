import React from "react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { BookDetail } from "@/components/books/book-detail";
import { RecentlyViewedTracker } from "@/components/books/recently-viewed-tracker";
import { submitBookReview, toggleFavoriteForBook } from "@/lib/books/actions";
import { canonicalBookSlug } from "@/lib/books/slug";
import { getBookDetailPageData } from "@/lib/catalog/service";
import { db } from "@/lib/db";
import { normalizeReadingProgress } from "@/lib/reading/progress";
import { buildBookMetadata, buildPageMetadata } from "@/lib/site/metadata";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);
  if (!book) {
    return buildPageMetadata({ title: "Книга не найдена", description: "Запрошенная книга не найдена в каталоге.", path: `/books/${slug}`, noIndex: true });
  }
  return buildBookMetadata({ title: book.title, description: book.description, path: `/books/${book.slug}`, imagePath: book.coverImage });
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let requestedSlug = slug;
  try {
    requestedSlug = decodeURIComponent(slug);
  } catch {
    // Next normally provides decoded params; malformed percent sequences stay literal.
  }
  const session = await auth();
  const viewerId = session?.user?.id;

  // Older/manual admin entries could persist a title-like slug containing spaces.
  // Resolve those URLs once and redirect to the canonical public slug instead of
  // rendering Next.js notFound() behind an HTTP 200 RSC response.
  const canonicalCandidate = canonicalBookSlug(requestedSlug, requestedSlug);
  if (requestedSlug !== canonicalCandidate) {
    const aliasBook = await db.book.findFirst({
      where: {
        isPublished: true,
        OR: [
          { slug: canonicalCandidate },
          { title: { equals: requestedSlug, mode: "insensitive" } },
          { slug: { equals: requestedSlug, mode: "insensitive" } }
        ]
      },
      select: { slug: true }
    });

    if (aliasBook && aliasBook.slug !== requestedSlug) redirect(`/books/${aliasBook.slug}`);
  }

  const [book, reviewState, progress] = await Promise.all([
    getBookDetailPageData(requestedSlug),
    db.book.findFirst({
      where: { slug: requestedSlug, isPublished: true },
      select: {
        reviews: {
          where: { status: "PUBLISHED" },
          include: { user: true },
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    viewerId ? db.readingProgress.findFirst({ where: { userId: viewerId, book: { slug: requestedSlug } } }) : Promise.resolve(null)
  ]);

  if (!book || !reviewState) notFound();

  const [favorite, pendingReviews] = await Promise.all([
    viewerId ? db.favorite.findUnique({ where: { userId_bookId: { userId: viewerId, bookId: book.id } } }) : Promise.resolve(null),
    viewerId ? db.review.findMany({ where: { userId: viewerId, bookId: book.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }) : Promise.resolve([])
  ]);

  const normalizedProgress = normalizeReadingProgress({ progressPercent: progress?.progressPercent ?? 0, completedAt: progress?.completedAt ?? null });

  return (
    <>
      <RecentlyViewedTracker book={{ slug: book.slug, title: book.title, authors: book.authors, year: book.year, coverImage: book.coverImage }} />
      <BookDetail
        bookId={book.id}
        slug={book.slug}
        title={book.title}
        subtitle={book.subtitle}
        description={book.description}
        externalReadingUrl={book.externalReadingUrl}
        year={book.year}
        coverImage={book.coverImage}
        blurDataUrl={book.blurDataUrl}
        dominantColor={book.dominantColor}
        authors={book.authors}
        genres={book.genres}
        publisher={book.publisher}
        edition={book.edition}
        isbn13={book.isbn13}
        language={book.language}
        pages={book.pages}
        ratingAverage={book.ratingAverage}
        ratingsCount={book.ratingsCount}
        isFeatured={book.isFeatured}
        isFavorite={Boolean(favorite)}
        readingProgressPercent={normalizedProgress.percent}
        readingMode={book.readingMode}
        readHref={book.readHref}
        readLabel={book.readLabel}
        signInHref={`/auth/sign-in?callbackUrl=${encodeURIComponent(`/books/${book.slug}`)}`}
        isAuthenticated={Boolean(viewerId)}
        isAdmin={session?.user?.role === "ADMIN"}
        favoriteAction={toggleFavoriteForBook}
        reviewAction={submitBookReview}
        pendingReviews={pendingReviews.map((review) => ({ id: review.id, rating: review.rating, content: review.content, createdAt: review.createdAt.toISOString() }))}
        reviews={reviewState.reviews.map((review) => ({ id: review.id, rating: review.rating, content: review.content, authorName: review.user.name ?? review.user.email, createdAt: review.createdAt.toISOString() }))}
      />
    </>
  );
}
