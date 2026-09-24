import { describe, expect, it } from "vitest";

import { dedupeImportedBooks } from "@/lib/import/dedupe";
import type { NormalizedImportedBook } from "@/lib/import/types";

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

describe("dedupeImportedBooks", () => {
  it("dedupes by isbn13 before title and year", () => {
    const books = dedupeImportedBooks([
      createBook({ isbn13: "9780441172719" }),
      createBook({
        provider: "google-books",
        externalId: "google-dune",
        isbn13: "9780441172719",
        description: "A longer and richer description of Dune.",
        coverUrl: "https://example.com/dune.jpg"
      })
    ]);

    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      isbn13: "9780441172719",
      coverUrl: "https://example.com/dune.jpg"
    });
    expect(books[0].description).toBe("A longer and richer description of Dune.");
  });

  it("dedupes by isbn10 when isbn13 is unavailable", () => {
    const books = dedupeImportedBooks([
      createBook({ title: "Neuromancer", externalId: "OL-neuromancer", isbn10: "0441569595" }),
      createBook({
        title: "Neuromancer",
        provider: "google-books",
        externalId: "google-neuromancer",
        isbn10: "0441569595",
        genres: ["Science Fiction", "Cyberpunk"]
      })
    ]);

    expect(books).toHaveLength(1);
    expect(books[0].genres).toEqual(["Science Fiction", "Cyberpunk"]);
  });

  it("falls back to normalized title author year matching", () => {
    const books = dedupeImportedBooks([
      createBook({
        title: "The Left Hand of Darkness",
        externalId: "OL-left-hand",
        authors: ["Ursula K. Le Guin"],
        year: 1969
      }),
      createBook({
        title: "  the left hand   of darkness ",
        provider: "google-books",
        externalId: "google-left-hand",
        authors: ["  Ursula K. Le Guin "],
        year: 1969,
        coverUrl: "https://example.com/left-hand.jpg"
      })
    ]);

    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("The Left Hand of Darkness");
    expect(books[0].coverUrl).toBe("https://example.com/left-hand.jpg");
  });
});
