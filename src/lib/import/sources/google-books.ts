import { normalizeGoogleBook } from "@/lib/import/normalize";
import type {
  GoogleBooksSourceOptions,
  GoogleBooksVolumesResponse,
  NormalizedImportedBook
} from "@/lib/import/types";

const GOOGLE_BOOKS_VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";

export async function fetchGoogleBooks(
  queries: string[],
  options: GoogleBooksSourceOptions = {}
): Promise<NormalizedImportedBook[]> {
  const fetcher = options.fetcher ?? fetch;
  const limit = Math.min(options.limitPerQuery ?? 20, 40);
  const results = await Promise.all(
    queries
      .map((query) => query.trim())
      .filter(Boolean)
      .map(async (query) => {
        const url = new URL(GOOGLE_BOOKS_VOLUMES_URL);
        url.searchParams.set("q", query);
        url.searchParams.set("maxResults", String(limit));

        if (options.apiKey) {
          url.searchParams.set("key", options.apiKey);
        }

        const response = await fetcher(url.toString());

        if (!response.ok) {
          throw new Error(`Google Books request failed for "${query}" with status ${response.status}.`);
        }

        const data = (await response.json()) as GoogleBooksVolumesResponse;

        return (data.items ?? []).flatMap((item) => {
          try {
            return [normalizeGoogleBook(item)];
          } catch {
            return [];
          }
        });
      })
  );

  return results.flat();
}
