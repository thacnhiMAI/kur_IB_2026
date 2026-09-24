import { describe, expect, it } from "vitest";

import { bookSchema } from "@/lib/validators/book";

describe("bookSchema", () => {
  it("accepts a valid book payload", () => {
    const parsed = bookSchema.parse({
      title: "Clean Architecture",
      slug: "clean-architecture",
      description: "A book about software architecture.",
      year: 2017,
      language: "ru",
      pages: 432
    });

    expect(parsed.slug).toBe("clean-architecture");
  });

  it("accepts extended metadata for imported books", () => {
    const result = bookSchema.parse({
      title: "The Left Hand of Darkness",
      slug: "left-hand-of-darkness",
      subtitle: "A Novel",
      originalTitle: "The Left Hand of Darkness",
      description: "Classic speculative fiction novel.",
      coverImage: "https://example.com/left-hand.jpg",
      year: 1969,
      isbn10: "0441478123",
      isbn13: "9780441478125",
      publisher: "Ace Books",
      edition: "50th Anniversary",
      language: "en",
      pages: 304,
      isFeatured: true,
      isPublished: true
    });

    expect(result.isbn13).toBe("9780441478125");
    expect(result.isFeatured).toBe(true);
  });
});
