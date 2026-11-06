import { render, screen, within } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, vi } from "vitest";

const { generateRecommendationsForUser, getLatestRecommendationSnapshot } = vi.hoisted(() => ({
  generateRecommendationsForUser: vi.fn(),
  getLatestRecommendationSnapshot: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: "user-1",
    name: "Reader",
    email: "reader@example.com",
    image: null,
    role: "USER"
  }))
}));

vi.mock("@/lib/recommendations/service", () => ({
  generateRecommendationsForUser,
  getLatestRecommendationSnapshot
}));

import RecommendationsPage from "@/app/recommendations/page";

vi.mock("@/lib/db", () => ({ db: { favorite: { findMany: vi.fn().mockResolvedValue([]) } } }));
vi.mock("@/app/recommendations/actions", () => ({ setRecommendationFavorite: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

type ElementProps = { children?: ReactNode; action?: () => Promise<void> };

function findElementByType(node: ReactNode, type: string): ReactElement<ElementProps> | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if ("type" in node && node.type === type) {
    return node as ReactElement<ElementProps>;
  }

  if (!("props" in node)) {
    return null;
  }

  const children = (node as ReactElement<ElementProps>).props.children;

  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findElementByType(child, type);

      if (match) {
        return match;
      }
    }

    return null;
  }

  return findElementByType(children, type);
}

describe("RecommendationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const page = await RecommendationsPage();

    render(page);

    expect(
      screen.getByRole("heading", { name: "Персональные рекомендации" })
    ).toBeInTheDocument();
    expect(getLatestRecommendationSnapshot).toHaveBeenCalledWith("user-1");
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

    const refreshForm = findElementByType(page, "form");

    expect(refreshForm).not.toBeNull();
    await refreshForm?.props.action?.();
    expect(generateRecommendationsForUser).toHaveBeenCalledWith("user-1");
  });

  it("shows placeholders when no snapshot is available yet", async () => {
    getLatestRecommendationSnapshot.mockResolvedValue(null);

    const page = await RecommendationsPage();

    render(page);

    expect(screen.queryByTestId("recommendation-card")).not.toBeInTheDocument();
    expect(getLatestRecommendationSnapshot).toHaveBeenCalledWith("user-1");
    expect(
      screen.getByText("Нажмите кнопку выше, чтобы получить первую персональную подборку.")
    ).toBeInTheDocument();
  });
});
