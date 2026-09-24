import { normalizeOpenLibraryBook } from "@/lib/import/normalize";
import type {
  ImportSourceOptions,
  NormalizedImportedBook,
  OpenLibrarySearchResponse
} from "@/lib/import/types";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";

export async function fetchOpenLibraryBooks(
  queries: string[],
  options: ImportSourceOptions = {}
): Promise<NormalizedImportedBook[]> {
  const fetcher = options.fetcher ?? fetch;
  const limit = options.limitPerQuery ?? 20;
  const results = await Promise.all(
    queries
      .map((query) => query.trim())
      .filter(Boolean)
      .map(async (query) => {
        const url = new URL(OPEN_LIBRARY_SEARCH_URL);
        url.searchParams.set("q", query);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set(
          "fields",
          [
            "key",
            "title",
            "subtitle",
            "first_publish_year",
            "author_name",
            "isbn",
            "cover_i",
            "subject",
            "language",
            "number_of_pages_median",
            "publisher",
            "ratings_average",
            "ratings_count"
          ].join(",")
        );

        const response = await fetcher(url.toString());

        if (!response.ok) {
          throw new Error(`Open Library request failed for "${query}" with status ${response.status}.`);
        }

        const data = (await response.json()) as OpenLibrarySearchResponse;

        return (data.docs ?? []).flatMap((doc) => {
          try {
            return [normalizeOpenLibraryBook(doc)];
          } catch {
            return [];
          }
        });
      })
  );

  return results.flat();
}
