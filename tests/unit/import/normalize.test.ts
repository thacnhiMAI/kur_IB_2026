import { describe, expect, it } from "vitest";

import { normalizeGoogleBook, normalizeOpenLibraryBook } from "@/lib/import/normalize";

describe("normalize imported books", () => {
  it("maps Open Library and Google Books payloads into one DTO", () => {
    const openLibrary = normalizeOpenLibraryBook({
      key: "/works/OL82563W",
      title: "Dune",
      first_publish_year: 1965,
      author_name: ["Frank Herbert"],
      isbn: ["9780441172719"],
      cover_i: 8101356
    });

    const google = normalizeGoogleBook({
      id: "google-dune",
      volumeInfo: {
        title: "Dune",
        authors: ["Frank Herbert"],
        publishedDate: "1965-08-01",
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780441172719" }]
      }
    });

    expect(openLibrary).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      year: 1965,
      isbn13: "9780441172719",
      provider: "open-library",
      externalId: "OL82563W",
      sourceUrl: "https://openlibrary.org/works/OL82563W"
    });
    expect(openLibrary.coverUrl).toContain("covers.openlibrary.org");

    expect(google).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      year: 1965,
      isbn13: "9780441172719",
      provider: "google-books",
      externalId: "google-dune"
    });
    expect(google.description).toContain("Dune");
  });

  it("normalizes provider-specific metadata and fallbacks", () => {
    const openLibrary = normalizeOpenLibraryBook({
      key: "/works/OL1W",
      title: "The Dispossessed",
      subtitle: "An Ambiguous Utopia",
      first_publish_year: 1974,
      author_name: ["Ursula K. Le Guin"],
      language: ["/languages/eng"],
      subject: ["Science Fiction", "Politics"],
      publisher: ["Harper & Row"],
      isbn: ["0-06-105488-7"]
    });

    const google = normalizeGoogleBook({
      id: "google-dispossessed",
      volumeInfo: {
        title: "The Dispossessed",
        subtitle: "An Ambiguous Utopia",
        description: "A novel about anarchism and exile.",
        authors: ["Ursula K. Le Guin"],
        categories: ["Science Fiction"],
        publishedDate: "1974",
        language: "en",
        publisher: "Harper & Row",
        pageCount: 341,
        infoLink: "http://books.google.test/dispossessed",
        imageLinks: {
          thumbnail: "http://images.google.test/dispossessed.jpg"
        },
        industryIdentifiers: [{ type: "ISBN_10", identifier: "0061054887" }]
      }
    });

    expect(openLibrary).toMatchObject({
      subtitle: "An Ambiguous Utopia",
      language: "eng",
      publisher: "Harper & Row",
      isbn10: "0061054887",
      genres: ["Science Fiction", "Politics"]
    });

    expect(google).toMatchObject({
      subtitle: "An Ambiguous Utopia",
      language: "en",
      pages: 341,
      publisher: "Harper & Row",
      isbn10: "0061054887",
      sourceUrl: "http://books.google.test/dispossessed"
    });
    expect(google.coverUrl).toBe("https://images.google.test/dispossessed.jpg");
  });
});
