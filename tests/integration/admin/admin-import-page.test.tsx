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
      count: vi
        .fn()
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(28)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(35)
        .mockResolvedValueOnce(26)
    },
    bookSourceRecord: {
      findFirst: vi.fn(async () => ({
        provider: "google-books",
        lastImportedAt: new Date("2026-09-24T10:00:00.000Z"),
        book: {
          title: "The Design of Everyday Things"
        }
      }))
    }
  }
}));

import AdminImportPage from "@/app/admin/import/page";

describe("AdminImportPage", () => {
  it("renders import controls and summary widgets", async () => {
    render(await AdminImportPage());

    expect(screen.getByRole("heading", { name: "Импорт каталога" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Запустить импорт" })).toBeInTheDocument();
    expect(screen.getByText("На витрине")).toBeInTheDocument();
    expect(screen.getByText("Опубликовано")).toBeInTheDocument();
    expect(screen.getByText("Кэшированные обложки")).toBeInTheDocument();
    expect(screen.getByText("google-books")).toBeInTheDocument();
  });
});
