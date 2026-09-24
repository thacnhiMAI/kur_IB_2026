import { dedupeImportedBooks } from "@/lib/import/dedupe";
import {
  createImportReport,
  finalizeImportReport,
  recordImportResult,
  recordProviderFailure,
  setFetchedCount,
  type ImportReport
} from "@/lib/import/report";
import { fetchGoogleBooks } from "@/lib/import/sources/google-books";
import { fetchOpenLibraryBooks } from "@/lib/import/sources/open-library";
import type {
  GoogleBooksSourceOptions,
  ImportSourceOptions,
  NormalizedImportedBook
} from "@/lib/import/types";
import { upsertImportedBook } from "@/lib/import/upsert";

export const DEFAULT_IMPORT_QUERIES = ["design", "science fiction", "history", "business"];

export type ImportBooksFromProvidersInput = {
  queries?: string[];
  openLibraryOptions?: ImportSourceOptions;
  googleBooksOptions?: GoogleBooksSourceOptions;
  seedBooks?: NormalizedImportedBook[];
};

export async function importBooksFromProviders(
  input: ImportBooksFromProvidersInput = {}
): Promise<ImportReport> {
  const queries = (input.queries ?? DEFAULT_IMPORT_QUERIES)
    .map((query) => query.trim())
    .filter(Boolean);
  const report = createImportReport(queries);

  const [openLibraryResult, googleBooksResult] = await Promise.allSettled([
    fetchOpenLibraryBooks(queries, input.openLibraryOptions),
    fetchGoogleBooks(queries, input.googleBooksOptions)
  ]);

  const imported: NormalizedImportedBook[] = [...(input.seedBooks ?? [])];

  if (openLibraryResult.status === "fulfilled") {
    imported.push(...openLibraryResult.value);
  } else {
    recordProviderFailure(report, {
      provider: "open-library",
      message: openLibraryResult.reason instanceof Error ? openLibraryResult.reason.message : String(openLibraryResult.reason)
    });
  }

  if (googleBooksResult.status === "fulfilled") {
    imported.push(...googleBooksResult.value);
  } else {
    recordProviderFailure(report, {
      provider: "google-books",
      message: googleBooksResult.reason instanceof Error ? googleBooksResult.reason.message : String(googleBooksResult.reason)
    });
  }

  const normalized = dedupeImportedBooks(imported);
  setFetchedCount(report, normalized.length);

  for (const book of normalized) {
    const result = await upsertImportedBook(book);
    recordImportResult(report, result);
  }

  return finalizeImportReport(report);
}
