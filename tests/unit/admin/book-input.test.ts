import { describe, expect, it } from "vitest";

import { parseBookPayload } from "@/lib/admin/book-input";

describe("parseBookPayload", () => {
  it("normalizes author and genre id arrays", () => {
    const parsed = parseBookPayload({
      title: "Design of Everyday Things",
      slug: "design-of-everyday-things",
      description: "A classic book about interfaces and design decisions.",
      year: 2013,
      isbn: "",
      language: "ru",
      pages: 384,
      authorIds: ["author-1", "", "author-2"],
      genreIds: ["genre-1", "genre-2"]
    });

    expect(parsed.authorIds).toEqual(["author-1", "author-2"]);
    expect(parsed.genreIds).toEqual(["genre-1", "genre-2"]);
  });
});
