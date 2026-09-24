import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({
    id: "admin-1",
    role: "ADMIN"
  }))
}));

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      findMany: vi.fn(async () => [
        {
          id: "book-1",
          title: "Дизайн привычных вещей",
          slug: "design-of-everyday-things",
          description: "Классическая книга о проектировании.",
          year: 2013,
          language: "ru",
          coverImage: "https://example.com/design.jpg",
          sourcePrimary: "open-library",
          isFeatured: true,
          isPublished: true,
          authors: [
            {
              author: {
                id: "author-1",
                name: "Don Norman"
              }
            }
          ],
          genres: [
            {
              genre: {
                id: "genre-1",
                name: "Design"
              }
            }
          ],
          coverAssets: [
            {
              status: "ready"
            }
          ],
          sourceRecords: [
            {
              provider: "open-library"
            }
          ]
        }
      ])
    }
  }
}));

import AdminBooksPage from "@/app/admin/books/page";

describe("AdminBooksPage", () => {
  it("shows the admin catalog title", async () => {
    render(await AdminBooksPage());

    expect(screen.getByRole("heading", { name: "Управление книгами" })).toBeInTheDocument();
    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
    expect(screen.getByText(/Авторы:\s*Don Norman/i)).toBeInTheDocument();
    expect(screen.getByText(/Жанры:\s*Design/i)).toBeInTheDocument();
    expect(screen.getByText("Витрина")).toBeInTheDocument();
    expect(screen.getByText("Опубликовано")).toBeInTheDocument();
    expect(screen.getByText(/Импорт:\s*open-library/i)).toBeInTheDocument();
    expect(screen.getByText(/Обложка:\s*Кэширована/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Импорт каталога" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
  });
});
