import { describe, expect, it } from "vitest";

import {
  MAX_RECENTLY_VIEWED_BOOKS,
  mergeRecentlyViewedBook
} from "@/lib/books/recently-viewed";

describe("mergeRecentlyViewedBook", () => {
  it("moves an existing book to the front without creating duplicates", () => {
    const result = mergeRecentlyViewedBook(
      [
        { slug: "a", title: "A", authors: [], year: 2020, coverImage: null, viewedAt: 10 },
        { slug: "b", title: "B", authors: [], year: 2021, coverImage: null, viewedAt: 20 }
      ],
      { slug: "a", title: "A", authors: [], year: 2020, coverImage: null, viewedAt: 30 }
    );

    expect(result.map((item) => item.slug)).toEqual(["a", "b"]);
  });

  it("keeps only the latest ten books", () => {
    const existing = Array.from({ length: MAX_RECENTLY_VIEWED_BOOKS }, (_, index) => ({
      slug: `book-${index}`,
      title: `Book ${index}`,
      authors: [],
      year: 2020,
      coverImage: null,
      viewedAt: index
    }));

    const result = mergeRecentlyViewedBook(existing, {
      slug: "new-book",
      title: "New Book",
      authors: [],
      year: 2026,
      coverImage: null,
      viewedAt: 100
    });

    expect(result).toHaveLength(MAX_RECENTLY_VIEWED_BOOKS);
    expect(result[0]?.slug).toBe("new-book");
  });
});
