import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { BookForm } from "@/components/admin/book-form";

describe("BookForm reading content controls", () => {
  it("renders PDF and external reading source controls", () => {
    render(
      <BookForm
        action={async () => {}}
        submitLabel="Сохранить"
        options={{ authors: [], genres: [] }}
        initialValues={{
          externalUrl: "https://example.com/read",
          contentSummary: ["Основная внешняя ссылка: https://example.com/read"]
        }}
      />
    );

    expect(screen.getByText("PDF файл")).toBeInTheDocument();
    expect(screen.getByText("Внешняя ссылка для чтения")).toBeInTheDocument();
    expect(screen.getByText("Сделать PDF основным источником")).toBeInTheDocument();
    expect(screen.getByText(/Основная внешняя ссылка/i)).toBeInTheDocument();
  });
});
