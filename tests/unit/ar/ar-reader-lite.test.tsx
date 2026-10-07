import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  it("opens, closes, and pages through the preview spreads", () => {
    render(<ARReaderLite book={BOOK} renderer="book-solid" />);

    expect(screen.getByText("Closed book")).toBeInTheDocument();
    expect(screen.getByTestId("reader-lite-closed-book")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.queryByText("Open the book")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open book" }));
    expect(screen.getByText("3D Reader Lite")).toBeInTheDocument();
    expect(screen.getByTestId("reader-lite-open-book")).toBeInTheDocument();
    expect(screen.getByText("Open the book")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("About this book")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Reading summary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("About this book")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close book" }));
    expect(screen.getByText("Closed book")).toBeInTheDocument();
    expect(screen.getByTestId("reader-lite-closed-book")).toBeInTheDocument();
    expect(screen.queryByText("About this book")).not.toBeInTheDocument();
  });
});
