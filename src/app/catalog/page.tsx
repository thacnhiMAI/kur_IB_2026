import React from "react";

import { auth } from "@/auth";
import { QRScanner } from "@/components/ar/qr-scanner";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { FeaturedShelf } from "@/components/catalog/featured-shelf";
import { RecentlyViewedBooks } from "@/components/catalog/recently-viewed-books";
import { SearchableCatalogResults } from "@/components/search/searchable-catalog-results";
import type { CatalogSearchParams } from "@/lib/catalog/queries";
import { getCatalogPageData } from "@/lib/catalog/service";
import { db } from "@/lib/db";
import { normalizeReadingProgress } from "@/lib/reading/progress";
import { buildPageMetadata } from "@/lib/site/metadata";

export const revalidate = 300;
export const metadata = buildPageMetadata({
  title: "Каталог",
  description: "Каталог книг с серверным поиском, независимой featured-полкой и cursor pagination.",
  path: "/catalog"
});

export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const catalogParams: CatalogSearchParams = {
    q: params.q,
    genre: params.genre,
    author: params.author,
    year: params.year,
    cursor: params.cursor,
    direction: params.direction === "prev" ? "prev" : "next"
  };
  const [session, data] = await Promise.all([auth(), getCatalogPageData(catalogParams)]);

  const progressByBookId = session?.user?.id
    ? new Map(
        (
          await db.readingProgress.findMany({
            where: {
              userId: session.user.id,
              bookId: { in: data.books.map((book) => book.id) }
            }
          })
        ).map((progress) => [progress.bookId, progress])
      )
    : new Map();

  const booksWithProgress = data.books.map((book) => {
    const progress = progressByBookId.get(book.id);
    const normalized = progress
      ? normalizeReadingProgress({
          progressPercent: progress.progressPercent,
          completedAt: progress.completedAt
        })
      : { percent: 0, status: "not-started" as const };

    return {
      ...book,
      progressPercent: normalized.percent,
      readingStatus: normalized.status
    };
  });

  // Featured is deliberately queried independently from q/author/genre/year.
  // Searching the main catalog must never rewrite or filter this shelf.
  const shelfBooks = data.featuredBooks;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 border-b border-[var(--surface-border)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="concept-kicker">Библиотека</p>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-5xl">Каталог</h1>
          <p className="max-w-2xl leading-7 text-[var(--text-secondary)]">
            Featured-полка остаётся стабильной, а поиск и фильтры работают только с основными результатами.
          </p>
        </div>
        <div className="concept-pill w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
          25 книги / страница
        </div>
      </section>

      <FeaturedShelf books={shelfBooks} />

      <CatalogFilters filters={data.filters} params={catalogParams} />
      <QRScanner />

      <section id="catalog-results" className="space-y-6">
        <div className="flex flex-col gap-3 border-b border-[var(--surface-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="concept-kicker">Результаты</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Все книги</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {booksWithProgress.length > 0
              ? `Показано ${booksWithProgress.length} книг на текущей странице`
              : "Измените запрос или фильтры, чтобы расширить выборку"}
          </p>
        </div>

        <SearchableCatalogResults
          books={booksWithProgress}
          pagination={data.pagination}
        />
      </section>

      <RecentlyViewedBooks />
    </div>
  );
}
