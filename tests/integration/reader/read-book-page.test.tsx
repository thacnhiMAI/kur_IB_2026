import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, notFound } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null)
}));

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      findFirst
    }
  }
}));

vi.mock("next/navigation", () => ({
  notFound
}));

vi.mock("@/components/reader/pdf-reader-shell", () => ({
  PdfReaderShell: ({ title, fileUrl }: { title: string; fileUrl: string }) => (
    <div data-testid="pdf-reader-shell">
      {title}
      {fileUrl}
    </div>
  )
}));

vi.mock("@/components/reader/external-reader-shell", () => ({
  ExternalReaderShell: ({ title, href }: { title: string; href: string }) => (
    <div>
      <span>{title}</span>
      <a href={href}>Открыть внешний источник</a>
    </div>
  )
}));

import ReadBookPage from "@/app/read/books/[slug]/page";

describe("ReadBookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pdf reader when a primary pdf exists", async () => {
    findFirst.mockResolvedValue({
      title: "Babel",
      contents: [
        {
          id: "pdf-1",
          sourceType: "PDF",
          status: "READY",
          isPrimary: true,
          storagePath: "D:/lab/Kur_IB/public/reading/babel.pdf",
          publicUrl: "/reading/babel.pdf",
          externalUrl: null
        }
      ]
    });

    render(await ReadBookPage({ params: Promise.resolve({ slug: "babel" }) }));

    expect(screen.getByTestId("pdf-reader-shell")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-reader-shell")).toHaveTextContent("/reading/babel.pdf");
  });

  it("falls back to the external reader shell when only an external source exists", async () => {
    findFirst.mockResolvedValue({
      title: "Babel",
      contents: [
        {
          id: "ext-1",
          sourceType: "EXTERNAL_LINK",
          status: "READY",
          isPrimary: true,
          storagePath: null,
          publicUrl: null,
          externalUrl: "https://example.com/read/babel"
        }
      ]
    });

    render(await ReadBookPage({ params: Promise.resolve({ slug: "babel" }) }));

    expect(screen.getByRole("link", { name: "Открыть внешний источник" })).toHaveAttribute(
      "href",
      "https://example.com/read/babel"
    );
  });
});
