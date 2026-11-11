import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { BookCoverImage } from "@/components/books/book-cover-image";

it("renders an external cover directly and falls back if the browser cannot load it", () => {
  const src = "https://publisher.example/cover.jpg";
  render(<BookCoverImage src={src} fallback="/covers/fallback-book.jpg" width={120} height={180} alt="Book cover" />);

  const image = screen.getByRole("img", { name: "Book cover" });
  expect(image).toHaveAttribute("src", src);
  expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  fireEvent.error(image);
  expect(decodeURIComponent(image.getAttribute("src") ?? "")).toContain("/covers/fallback-book.jpg");
});
