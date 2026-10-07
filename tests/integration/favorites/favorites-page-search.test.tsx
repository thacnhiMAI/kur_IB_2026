import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchableFavoritesList } from "@/components/search/searchable-favorites-list";

describe("SearchableFavoritesList", () => {
  it("filters favorites by title and author", async () => {
    render(
      <SearchableFavoritesList
        items={[
          {
            id: "fav-1",
            slug: "design-of-everyday-things",
            title: "Дизайн привычных вещей",
            authors: ["Дон Норман"],
            description: "Классическая книга.",
            progressPercent: 42,
            readHref: "/read/books/design-of-everyday-things",
            readLabel: "Читать"
          },
          {
            id: "fav-2",
            slug: "clean-code",
            title: "Clean Code",
            authors: ["Robert Martin"],
            description: "Code craftsmanship.",
            progressPercent: 0,
            readHref: "/read/books/clean-code",
            readLabel: "Читать"
          }
        ]}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Поиск по названию, автору или описанию"),
      { target: { value: "норман" } }
    );

    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
    expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
  });
});
