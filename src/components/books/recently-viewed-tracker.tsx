"use client";

import { useEffect, useRef } from "react";
import { recordBookViewForRecommendations } from "@/lib/books/actions";

import {
  mergeRecentlyViewedBook,
  parseRecentlyViewedBooks,
  RECENTLY_VIEWED_STORAGE_KEY
} from "@/lib/books/recently-viewed";
import { readAppSettingsFromBrowser } from "@/lib/preferences/settings";

export function RecentlyViewedTracker({
  book
}: {
  book: {
    slug: string;
    title: string;
    authors: string[];
    year: number;
    coverImage: string | null;
  };
}) {
  const trackedSlug = useRef<string | null>(null);
  useEffect(() => {
    try {
      if (!readAppSettingsFromBrowser().rememberRecentlyViewed) {
        return;
      }
      if (trackedSlug.current !== book.slug) {
        trackedSlug.current = book.slug;
        void recordBookViewForRecommendations(book.slug).catch(() => {
          // A transient tracking error must not interrupt reading the book.
        });
      }

      const existing = parseRecentlyViewedBooks(
        window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)
      );
      const next = mergeRecentlyViewedBook(existing, {
        ...book,
        viewedAt: Date.now()
      });

      window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage can be unavailable in private/restricted browser contexts.
    }
  }, [book]);

  return null;
}
