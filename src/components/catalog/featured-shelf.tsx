import React from "react";

import { BookCard } from "@/components/catalog/book-card";
import type { CatalogBookCard } from "@/lib/catalog/queries";

type FeaturedShelfProps = {
  books: CatalogBookCard[];
};

export function FeaturedShelf({ books }: FeaturedShelfProps) {
  if (books.length === 0) return null;

  return (
    <section id="featured-shelf" data-testid="featured-shelf" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="concept-kicker">Featured collection</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Выбор редакции</h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Эта полка загружается отдельно и остаётся неизменной при поиске и фильтрации «Все книги».
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{books.length} книг</p>
      </div>

      <div className="bookshelf-strip">
        {books.map((book) => (
          <BookCard key={book.id} variant="featured" {...book} />
        ))}
      </div>
    </section>
  );
}
