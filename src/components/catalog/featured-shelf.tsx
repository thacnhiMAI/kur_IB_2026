import React from "react";

import type { CatalogBookCard } from "@/lib/catalog/queries";

import { BookCard } from "@/components/catalog/book-card";

type FeaturedShelfProps = {
  books: CatalogBookCard[];
};

export function FeaturedShelf({ books }: FeaturedShelfProps) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section
      id="featured-shelf"
      data-testid="featured-shelf"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Витрина
          </p>
          <h2 className="text-2xl font-semibold text-slate-50">
            Featured collection
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Полка с книгами, которые задают тон каталогу и лучше всего
            показывают обновленную визуальную подачу.
          </p>
        </div>
        <p className="text-sm text-slate-400">
          {books.length} {books.length === 1 ? "книга" : "книги"} на витрине
        </p>
      </div>

      <div className="bookshelf-strip">
        {books.map((book) => (
          <BookCard key={book.id} variant="featured" {...book} />
        ))}
      </div>
    </section>
  );
}
