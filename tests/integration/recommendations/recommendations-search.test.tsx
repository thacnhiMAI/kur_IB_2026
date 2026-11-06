import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchableRecommendationsGrid } from "@/components/search/searchable-recommendations-grid";

vi.mock("@/app/recommendations/actions", () => ({ setRecommendationFavorite: vi.fn() }));

describe("SearchableRecommendationsGrid", () => {
  it("filters recommendations by title, author, and reason", async () => {
    render(
      <SearchableRecommendationsGrid
        items={[
          {
            id: "rec-1",
            bookId: "book-1",
            isFavorite: false,
            slug: "design-of-everyday-things",
            title: "Дизайн привычных вещей",
            authors: ["Дон Норман"],
            description: "Классическая книга.",
            reason: "Похожа на ваши любимые книги"
          },
          {
            id: "rec-2",
            bookId: "book-2",
            isFavorite: false,
            slug: "clean-code",
            title: "Clean Code",
            authors: ["Robert Martin"],
            description: "Code craftsmanship.",
            reason: "Высокий рейтинг у других читателей"
          }
        ]}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Поиск по названию, автору или причине рекомендации"),
      { target: { value: "любимые" } }
    );

    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
    expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
  });
});
