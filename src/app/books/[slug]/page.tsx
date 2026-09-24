import React from "react";
import { notFound } from "next/navigation";

import { BookDetail } from "@/components/books/book-detail";
import { getBookDetailPageData } from "@/lib/catalog/service";
import { getPublicBookSlugs } from "@/lib/catalog/public-cache";
import { buildBookMetadata, buildPageMetadata } from "@/lib/site/metadata";
import {
  recordBookFinished,
  recordBookInterest,
  submitBookReview,
  toggleFavoriteForBook
} from "@/lib/books/actions";
import { db } from "@/lib/db";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublicBookSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);

  if (!book) {
    return buildPageMetadata({
      title: "Книга не найдена",
      description: "Запрошенная книга не найдена в каталоге.",
      path: `/books/${slug}`,
      noIndex: true
    });
  }

  return buildBookMetadata({
    title: book.title,
    description: book.description,
    path: `/books/${book.slug}`,
    imagePath: book.coverImage
  });
}

export default async function BookDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [book, reviewState] = await Promise.all([
    getBookDetailPageData(slug),
    db.book.findFirst({
      where: {
        slug,
        isPublished: true
      },
      select: {
        reviews: {
          where: { status: "PUBLISHED" },
          include: { user: true },
          orderBy: { createdAt: "desc" }
        }
      }
    })
  ]);

  if (!book || !reviewState) {
    notFound();
  }

  return (
    <BookDetail
      bookId={book.id}
      slug={book.slug}
      title={book.title}
      subtitle={book.subtitle}
      description={book.description}
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
      favoriteAction={toggleFavoriteForBook}
      interestAction={recordBookInterest}
      finishedAction={recordBookFinished}
      initialReview={null}
      reviewAction={submitBookReview}
      reviews={reviewState.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        authorName: review.user.name ?? review.user.email
      }))}
    />
  );
}
