export const RECENTLY_VIEWED_STORAGE_KEY = "smart-library:recently-viewed:v1";
export const MAX_RECENTLY_VIEWED_BOOKS = 10;

export type RecentlyViewedBook = {
  slug: string;
  title: string;
  authors: string[];
  year: number;
  coverImage: string | null;
  viewedAt: number;
};

export function mergeRecentlyViewedBook(
  existing: RecentlyViewedBook[],
  nextBook: RecentlyViewedBook
) {
  return [
    nextBook,
    ...existing.filter((item) => item.slug !== nextBook.slug)
  ]
    .sort((left, right) => right.viewedAt - left.viewedAt)
    .slice(0, MAX_RECENTLY_VIEWED_BOOKS);
}

export function parseRecentlyViewedBooks(raw: string | null): RecentlyViewedBook[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is RecentlyViewedBook => {
        return Boolean(
          item &&
            typeof item === "object" &&
            typeof item.slug === "string" &&
            typeof item.title === "string" &&
            Array.isArray(item.authors) &&
            item.authors.every((author: unknown) => typeof author === "string") &&
            typeof item.year === "number" &&
            (typeof item.coverImage === "string" || item.coverImage === null) &&
            typeof item.viewedAt === "number"
        );
      })
      .slice(0, MAX_RECENTLY_VIEWED_BOOKS);
  } catch {
    return [];
  }
}
