import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedImportedBook } from "@/lib/import/types";

const { fetchOpenLibraryBooks, fetchGoogleBooks, upsertImportedBook } = vi.hoisted(() => ({
  fetchOpenLibraryBooks: vi.fn(),
  fetchGoogleBooks: vi.fn(),
  upsertImportedBook: vi.fn()
}));

vi.mock("@/lib/import/sources/open-library", () => ({
  fetchOpenLibraryBooks
}));

vi.mock("@/lib/import/sources/google-books", () => ({
  fetchGoogleBooks
}));

vi.mock("@/lib/import/upsert", () => ({
  upsertImportedBook
}));

import { importBooksFromProviders } from "@/lib/import/service";

function createBook(overrides: Partial<NormalizedImportedBook>): NormalizedImportedBook {
  return {
    title: "Dune",
    description: "Epic science fiction novel.",
    authors: ["Frank Herbert"],
    genres: ["Science Fiction"],
    year: 1965,
    language: "en",
    provider: "open-library",
    externalId: "OL1",
    ...overrides
  };
}

describe("importBooksFromProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a deduped orchestration summary with added, updated, and skipped counts", async () => {
    fetchOpenLibraryBooks.mockResolvedValue([
      createBook({
        externalId: "OL-dune",
        isbn13: "9780441172719"
      }),
      createBook({
        title: "Foundation",
        externalId: "OL-foundation",
        authors: ["Isaac Asimov"],
        year: 1951,
        isbn13: "9780553293357"
      })
    ]);

    fetchGoogleBooks.mockResolvedValue([
      createBook({
        provider: "google-books",
        externalId: "google-dune",
        isbn13: "9780441172719",
        coverUrl: "https://example.com/dune.jpg",
        description: "A longer and richer description of Dune."
      }),
      createBook({
        title: "Snow Crash",
        provider: "google-books",
        externalId: "google-snow-crash",
        authors: ["Neal Stephenson"],
        year: 1992,
        isbn13: "9780553380958"
      })
    ]);

    upsertImportedBook
      .mockResolvedValueOnce({
        kind: "added",
        bookId: "book-dune",
        bookSlug: "dune",
        coverStatus: "ready"
      })
      .mockResolvedValueOnce({
        kind: "updated",
        bookId: "book-foundation",
        bookSlug: "foundation",
        coverStatus: "failed"
      })
      .mockResolvedValueOnce({
        kind: "skipped",
        bookId: "book-snow-crash",
        bookSlug: "snow-crash",
        coverStatus: "missing"
      });

    const report = await importBooksFromProviders({ queries: ["science fiction"] });

    expect(fetchOpenLibraryBooks).toHaveBeenCalledWith(["science fiction"], undefined);
    expect(fetchGoogleBooks).toHaveBeenCalledWith(["science fiction"], undefined);
    expect(upsertImportedBook).toHaveBeenCalledTimes(3);
    expect(report).toMatchObject({
      queries: ["science fiction"],
      totalFetched: 3,
      added: 1,
      updated: 1,
      skipped: 1,
      coverFailures: 1
    });
    expect(report.providerFailures).toEqual([]);
  });
});
