"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import { deleteAdminBook } from "@/app/admin/books/actions";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { matchesAdminQuery } from "@/lib/admin/admin-search";

type AdminBookListItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  year: number;
  language: string;
  isFeatured: boolean;
  isPublished: boolean;
  authors: string[];
  genres: string[];
  sourceLabel: string;
  coverLabel: string;
};

type AdminBooksListProps = {
  books: AdminBookListItem[];
};

export function AdminBooksList({ books }: AdminBooksListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      books.filter((book) =>
        matchesAdminQuery(
          [
            book.title,
            book.slug,
            book.description,
            book.authors.join(" "),
            book.genres.join(" ")
          ].join(" "),
          query
        )
      ),
    [books, query]
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск: книги, авторы, жанры..."
        className="w-full rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-2)] px-5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-soft)]"
      />

      <div className="space-y-4">
        {filtered.map((book) => (
          <article key={book.id} className="editorial-surface rounded-[30px] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{book.title}</h2>
                <p className="text-sm text-[var(--text-muted)]">{book.slug}</p>
                <p className="leading-7 text-[var(--text-secondary)]">{book.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="rounded-full border border-[var(--surface-border)] px-3 py-1">Год: {book.year}</span>
                  <span className="rounded-full border border-[var(--surface-border)] px-3 py-1">Язык: {book.language}</span>
                  {book.isFeatured ? (
                    <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent-text)]">
                      Витрина
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-3 py-1 ${
                      book.isPublished
                        ? "border-emerald-500/40 bg-emerald-500/10 text-[var(--success-text)]"
                        : "border-amber-500/40 bg-amber-500/10 text-[var(--warning-text)]"
                    }`}
                  >
                    {book.isPublished ? "Опубликовано" : "Черновик"}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Авторы: {book.authors.length > 0 ? book.authors.join(", ") : "Не выбраны"}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Жанры: {book.genres.length > 0 ? book.genres.join(", ") : "Не выбраны"}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">Импорт: {book.sourceLabel}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Обложка: {book.coverLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/books/${book.id}/edit`}
                  className="editorial-button-secondary rounded-full px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  Редактировать
                </Link>
                <form action={deleteAdminBook.bind(null, book.id, book.slug)}>
                  <DeleteSubmitButton
                    idleLabel="Удалить"
                    pendingLabel="Удаление..."
                    confirmMessage={`Удалить книгу "${book.title}"?`}
                  />
                </form>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <div className="editorial-surface rounded-[30px] p-6 text-sm text-[var(--text-secondary)]">
            По вашему запросу книги не найдены.
          </div>
        ) : null}
      </div>
    </div>
  );
}
