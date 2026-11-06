import { describe, expect, it } from "vitest";

import { toCatalogBookCard } from "@/lib/books/presenters";

describe("book presenters", () => {
  it("prefers cached cover assets and keeps blur placeholder data", () => {
    const result = toCatalogBookCard({
      id: "book-1",
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: null,
      description: "Книга о проектировании.",
      year: 2013,
      coverImage: null,
      isFeatured: true,
      contents: [],
      authors: [{ author: { name: "Дон Норман", slug: "don-norman" } }],
      genres: [{ genre: { name: "Дизайн", slug: "design" } }],
      coverAssets: [
        {
          publicUrl: "/covers/design-of-everyday-things.jpg",
          dominantColor: "#112233",
          blurDataUrl: "data:image/jpeg;base64,AAA=",
          status: "ready"
        }
      ]
    } as never);

    expect(result.coverImage).toBe("/covers/design-of-everyday-things.jpg");
    expect(result.blurDataUrl).toBe("data:image/jpeg;base64,AAA=");
  });
});
