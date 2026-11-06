import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ARReaderLite } from "@/components/ar/ar-reader-lite";

const BOOK = {
  slug: "babel",
  title: "Babel",
  subtitle: "Or the Necessity of Violence",
  description: "A dark academic fantasy about language and empire.",
  coverImage: "/covers/babel.jpg",
  dominantColor: "#2F1E4D",
  authors: ["R. F. Kuang"],
  year: 2022,
  language: "en",
  pages: 560,
  publisher: "Harper Voyager",
  edition: "Hardcover"
};

describe("ARReaderLite", () => {
  it("shows a 3D cover and prevents anonymous access to PDF pages", () => {
    render(<ARReaderLite book={BOOK} renderer="book-solid" pdfUrl="/api/reading/content/1" isAuthenticated={false} />);

    expect(screen.getByText("3D Book Preview")).toBeInTheDocument();
    expect(screen.getByTestId("reader-lite-closed-book")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Предыдущий разворот/ })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Следующий разворот/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Открыть PDF в 3D" })).not.toBeInTheDocument();
  });
});
