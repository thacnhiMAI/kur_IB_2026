import { describe, expect, it } from "vitest";

import { filterSearchItems, normalizeSearchText } from "@/lib/search/filter";

describe("search filtering", () => {
  it("normalizes text for case-insensitive matching", () => {
    expect(normalizeSearchText("  Дон   Норман ")).toBe("дон норман");
  });

  it("matches by title, author, and reason fields", () => {
    const result = filterSearchItems(
      [
        {
          id: "book-1",
          title: "Дизайн привычных вещей",
          subtitle: "Исправленное издание",
          authors: ["Дон Норман"],
          description: "Книга о проектировании.",
          tags: ["Дизайн"],
          reason: "Похоже на ваши любимые книги"
        },
        {
          id: "book-2",
          title: "Clean Code",
          subtitle: null,
          authors: ["Robert Martin"],
          description: "Code craftsmanship.",
          tags: ["Engineering"],
          reason: "Высокий рейтинг"
        }
      ],
      "норман"
    );

    expect(result.map((item) => item.id)).toEqual(["book-1"]);
  });

  it("returns original items when query is empty", () => {
    const items = [
      {
        id: "book-1",
        title: "Book",
        subtitle: null,
        authors: [],
        description: "",
        tags: [],
        reason: ""
      }
    ];

    expect(filterSearchItems(items, "")).toEqual(items);
  });
});
