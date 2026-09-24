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
    author: {
      findMany: vi.fn(async () => [
        {
          id: "author-1",
          name: "Đon Norman",
          slug: "don-norman",
          _count: { books: 1 }
        }
      ])
    }
  }
}));

import AdminAuthorsPage from "@/app/admin/authors/page";

describe("AdminAuthorsPage", () => {
  it("shows the authors admin title", async () => {
    render(await AdminAuthorsPage());

    expect(screen.getByRole("heading", { name: "Quản lý tác giả" })).toBeInTheDocument();
    expect(screen.getByText("Đon Norman")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
  });
});
