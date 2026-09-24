import type { CatalogBookCard } from "@/lib/catalog/queries";

const DEFAULT_FEATURED_LIMIT = 6;

export function selectFeaturedBooks(
  books: CatalogBookCard[],
  limit = DEFAULT_FEATURED_LIMIT
) {
  return books
    .filter((book) => book.isFeatured)
    .sort((left, right) => {
      if (right.year !== left.year) {
        return right.year - left.year;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}
