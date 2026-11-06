"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React from "react";

import { BookCard } from "@/components/catalog/book-card";
import type { CatalogPagination } from "@/lib/catalog/queries";

type SearchableCatalogBook = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  authors: string[];
  genres: string[];
  year: number;
  coverImage: string | null;
  blurDataUrl: string | null;
  dominantColor: string;
  readingStatus: "not-started" | "in-progress" | "completed";
  progressPercent: number;
  readingMode: "internal" | "external" | "none";
  readHref: string | null;
  readLabel: "Читать" | "Открыть внешний источник" | null;
};

type SearchableCatalogResultsProps = {
  books: SearchableCatalogBook[];
  pagination: CatalogPagination;
  /** Backwards-compatible; search UI now lives in the unified catalog controls. */
  initialQuery?: string;
};

export function SearchableCatalogResults({ books, pagination }: SearchableCatalogResultsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildPageHref(cursor: string, direction: "next" | "prev") {
    const nextParams = new URLSearchParams(searchParams?.toString());
    nextParams.set("cursor", cursor);
    nextParams.set("direction", direction);
    return `${pathname}?${nextParams.toString()}#catalog-results`;
  }

  return (
    <div className="space-y-6">
      {books.length > 0 ? (
        <div className="premium-books-grid">
          {books.map((book) => <BookCard key={book.id} {...book} />)}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-[var(--surface-border-strong)] bg-[var(--surface-3)] p-10 text-center text-[var(--text-secondary)]">
          По вашему запросу книги не найдены.
        </div>
      )}

      {(
        <nav aria-label="Пагинация каталога" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-5">
          <div>
            {pagination.hasPreviousPage && pagination.previousCursor ? (
              <Link href={buildPageHref(pagination.previousCursor, "prev")} className="editorial-button-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-medium">
                ← Предыдущая страница
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{pagination.pageSize} книги / страница</p>
          <div>
            {pagination.hasNextPage && pagination.nextCursor ? (
              <Link href={buildPageHref(pagination.nextCursor, "next")} className="editorial-button-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-medium">
                Следующая страница →
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </div>
  );
}
