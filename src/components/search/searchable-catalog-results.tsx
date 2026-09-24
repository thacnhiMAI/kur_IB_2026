"use client";

import React from "react";
import { useMemo, useState } from "react";

import { BookCard } from "@/components/catalog/book-card";
import { UnifiedSearch } from "@/components/search/unified-search";
import { filterSearchItems } from "@/lib/search/filter";

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
};

export function SearchableCatalogResults({
  books
}: {
  books: SearchableCatalogBook[];
}) {
  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(() => {
    const searchableBooks = books.map((book) => ({
      ...book,
      tags: book.genres,
      reason: ""
    }));
    const matchingIds = new Set(
      filterSearchItems(searchableBooks, query).map((book) => book.id)
    );

    return books.filter((book) => matchingIds.has(book.id));
  }, [books, query]);

  return (
    <div className="space-y-6">
      <UnifiedSearch
        label="Быстрый поиск"
        placeholder="Поиск по названию, автору или жанру"
        onQueryChange={setQuery}
      />

      {filteredBooks.length > 0 ? (
        <div className="premium-books-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
          По локальному поиску книги не найдены.
        </div>
      )}
    </div>
  );
}
