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
    genre: {
      findMany: vi.fn(async () => [
        {
          id: "genre-1",
          name: "Thiết kế",
          slug: "design",
          _count: { books: 2 }
        }
      ])
    }
  }
}));

import AdminGenresPage from "@/app/admin/genres/page";

describe("AdminGenresPage", () => {
  it("shows the genres admin title", async () => {
    render(await AdminGenresPage());

    expect(screen.getByRole("heading", { name: "Quản lý thể loại" })).toBeInTheDocument();
    expect(screen.getByText("Thiết kế")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
  });
});
