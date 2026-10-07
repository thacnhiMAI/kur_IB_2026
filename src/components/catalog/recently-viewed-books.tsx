"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  parseRecentlyViewedBooks,
  RECENTLY_VIEWED_STORAGE_KEY,
  type RecentlyViewedBook
} from "@/lib/books/recently-viewed";
import { readAppSettingsFromBrowser } from "@/lib/preferences/settings";

export function RecentlyViewedBooks() {
  const [books, setBooks] = useState<RecentlyViewedBook[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const settings = readAppSettingsFromBrowser();
      setEnabled(settings.rememberRecentlyViewed);
      if (!settings.rememberRecentlyViewed) return;
      setBooks(parseRecentlyViewedBooks(window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)));
    } catch {
      setBooks([]);
    }
  }, []);

  if (!enabled || books.length === 0) return null;

  return (
    <section className="space-y-5 border-t border-[var(--surface-border)] pt-8">
      <div className="space-y-2">
        <p className="concept-kicker">История просмотра</p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Недавно просмотренные</h2>
        <p className="text-sm text-[var(--text-secondary)]">Хранятся только на этом устройстве, максимум 10 книг.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {books.map((book) => (
          <Link
            key={book.slug}
            href={`/books/${book.slug}`}
            className="concept-panel-soft rounded-[22px] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.35)]"
          >
            <p className="line-clamp-2 font-medium text-[var(--text-primary)]">{book.title}</p>
            <p className="mt-2 line-clamp-1 text-xs text-[var(--text-muted)]">
              {book.authors.length > 0 ? book.authors.join(", ") : "Неизвестный автор"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{book.year}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
