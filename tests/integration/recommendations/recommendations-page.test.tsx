import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

const { generateRecommendationsForUser, getLatestRecommendationSnapshot } = vi.hoisted(() => ({
  generateRecommendationsForUser: vi.fn(),
  getLatestRecommendationSnapshot: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: "user-1",
    name: "Reader",
    email: "reader@example.com",
    role: "USER"
  }))
}));

vi.mock("@/lib/recommendations/service", () => ({
  generateRecommendationsForUser,
  getLatestRecommendationSnapshot
}));

import RecommendationsPage from "@/app/recommendations/page";

describe("RecommendationsPage", () => {
  it("shows recommendation hero, insights, and rich card details", async () => {
    getLatestRecommendationSnapshot.mockResolvedValue({
      id: "snapshot-1",
      summary: "Подборка собрана из любимых авторов, жанров и завершённых книг.",
      strategy: "ai-enriched",
      status: "ready",
      provider: "openai",
      createdAt: new Date("2026-09-24T12:00:00.000Z"),
      insights: {
        favoriteGenres: ["Дизайн", "UX"],
        favoriteAuthors: ["Don Norman"],
        finishedBooks: ["Основание"],
        highRatedThemes: ["UX"]
      },
      items: [
        {
          id: "item-1",
          badge: "author-match",
          reason: "Похожа на книги, которые вы завершили и оценили высоко.",
          score: 9.4,
          book: {
            title: "Эмоциональный дизайн",
            slug: "emotional-design",
            coverImage: null,
            coverAssets: [
              {
                publicUrl: "/covers/emotional-design.jpg",
                blurDataUrl: "data:image/jpeg;base64,BBB="
              }
            ],
            authors: [{ author: { name: "Don Norman" } }]
          }
        }
      ]
    });

    render(await RecommendationsPage());

    expect(
      screen.getByRole("heading", { name: "Персональные рекомендации" })
    ).toBeInTheDocument();
    expect(screen.getByText("Любимые жанры")).toBeInTheDocument();
    expect(screen.getByText("Дизайн, UX")).toBeInTheDocument();
    expect(screen.getByText("author-match")).toBeInTheDocument();
    expect(
      screen.getByText("Похожа на книги, которые вы завершили и оценили высоко.")
    ).toBeInTheDocument();
    const card = screen.getByTestId("recommendation-card");
    expect(within(card).getByText("Don Norman")).toBeInTheDocument();
    expect(within(card).getByAltText("Эмоциональный дизайн")).toHaveAttribute(
      "sizes"
    );
    expect(
      within(card)
        .getByAltText("Эмоциональный дизайн")
        .getAttribute("src")
    ).toContain("emotional-design.jpg");
    expect(card).toBeInTheDocument();
  });

  it("shows placeholders when no snapshot is available yet", async () => {
    getLatestRecommendationSnapshot.mockResolvedValue(null);

    render(await RecommendationsPage());

    expect(screen.getAllByText("Нет данных")).toHaveLength(4);
    expect(
      screen.getByText("Нажмите кнопку выше, чтобы получить первую персональную подборку.")
    ).toBeInTheDocument();
  });
});
