import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogBookRecord } from "@/lib/catalog/queries";

const { bookFindFirst, favoriteFindUnique, progressFindFirst, auth } = vi.hoisted(() => ({
  bookFindFirst: vi.fn(),
  favoriteFindUnique: vi.fn(),
  progressFindFirst: vi.fn(),
  auth: vi.fn()
}));

vi.mock("@/auth", () => ({ auth }));

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      findFirst: bookFindFirst
    },
    favorite: {
      findUnique: favoriteFindUnique
    },
    readingProgress: {
      findFirst: progressFindFirst
    }
  }
}));

vi.mock("next/navigation", () => ({
  notFound
}));

vi.mock("@/lib/books/actions", () => ({
  toggleFavoriteForBook: vi.fn(async () => {}),
  submitBookReview: vi.fn(async () => {})
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null)
}));

import BookDetailPage from "@/app/books/[slug]/page";
import { getBookDetailPageData } from "@/lib/catalog/service";

function createBookDetailRecord(
  overrides: Partial<CatalogBookRecord> & {
    coverAsset?: {
      publicUrl: string;
      dominantColor: string | null;
      blurDataUrl: string | null;
      status?: string;
    } | null;
  } = {}
): CatalogBookRecord {
  const coverAsset = overrides.coverAsset ?? null;

  return {
    id: "book-1",
    slug: "design-of-everyday-things",
    title: "Дизайн привычных вещей",
    subtitle: "Исправленное издание",
    description: "Классическая книга о проектировании.",
    coverImage: "https://example.com/original-cover.jpg",
    year: 2013,
    publisher: "MIT Press",
    edition: "Revised",
    isbn13: "9780441172719",
    language: "ru",
    pages: 368,
    ratingAverage: 4.5,
    ratingsCount: 1200,
    isFeatured: true,
    authors: [
      {
        author: {
          slug: "don-norman",
          name: "Дон Норман"
        }
      }
    ],
    genres: [
      {
        genre: {
          slug: "dizayn",
          name: "Дизайн"
        }
      }
    ],
    coverAssets: coverAsset
      ? [
          {
            publicUrl: coverAsset.publicUrl,
            dominantColor: coverAsset.dominantColor,
            blurDataUrl: coverAsset.blurDataUrl,
            status: coverAsset.status ?? "ready"
          }
        ]
      : [],
    contents: [
      {
        id: "content-1",
        sourceType: "PDF",
        status: "READY",
        isPrimary: true,
        storagePath: "D:/lab/Kur_IB/public/reading/design.pdf",
        publicUrl: "/reading/design.pdf",
        externalUrl: null
      }
    ],
    ...overrides
  };
}

describe("getBookDetailPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
    favoriteFindUnique.mockResolvedValue(null);
    progressFindFirst.mockResolvedValue(null);
  });

  it("returns cached cover data and richer metadata for a published book", async () => {
    bookFindFirst.mockResolvedValue(
      createBookDetailRecord({
        coverAsset: {
          publicUrl: "/covers/design-of-everyday-things-9780441172719.jpg",
          dominantColor: "#112233",
          blurDataUrl: "data:image/jpeg;base64,AAA="
        }
      })
    );

    const data = await getBookDetailPageData("design-of-everyday-things");

    expect(bookFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "design-of-everyday-things",
          isPublished: true
        }
      })
    );
    expect(data).toMatchObject({
      title: "Дизайн привычных вещей",
      coverImage: "/covers/design-of-everyday-things-9780441172719.jpg",
      dominantColor: "#112233",
      blurDataUrl: "data:image/jpeg;base64,AAA=",
      publisher: "MIT Press",
      isbn13: "9780441172719",
      isFeatured: true
    });
  });

  it("returns null when the book is not available in the public catalog", async () => {
    bookFindFirst.mockResolvedValue(null);

    const data = await getBookDetailPageData("missing-book");

    expect(data).toBeNull();
  });

  it("renders the premium detail layout with cached cover metadata", async () => {
    bookFindFirst
      .mockResolvedValueOnce(
        createBookDetailRecord({
          coverAsset: {
            publicUrl: "/covers/design-of-everyday-things-9780441172719.jpg",
            dominantColor: "#112233",
            blurDataUrl: "data:image/jpeg;base64,AAA="
          }
        })
      )
      .mockResolvedValueOnce({
        reviews: [
          {
            id: "review-1",
            createdAt: new Date("2026-09-24T12:00:00Z"),
            rating: 5,
            content: "Очень полезная книга о проектировании.",
            user: {
              name: "Reader One",
              email: "reader@example.com"
            }
          }
        ]
      });

    render(await BookDetailPage({ params: Promise.resolve({ slug: "design-of-everyday-things" }) }));

    expect(
      screen.getByRole("heading", { name: "Дизайн привычных вещей" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("book-cover-stage")).toBeInTheDocument();
    expect(screen.getByText(/Издатель:/i)).toBeInTheDocument();
    expect(screen.getByText("MIT Press")).toBeInTheDocument();
    expect(screen.getByText(/ISBN-13:/i)).toBeInTheDocument();
    expect(screen.getByText("9780441172719")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Чтение книги" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Читать" })).toHaveAttribute(
      "href",
      "/read/books/design-of-everyday-things"
    );
    expect(screen.getByRole("heading", { name: "Открыть книгу в 3D / AR" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть 3D / AR" })).toHaveAttribute(
      "href",
      "/ar/books/design-of-everyday-things"
    );
    expect(screen.getByAltText("Дизайн привычных вещей")).toHaveAttribute(
      "sizes",
      "(max-width: 1280px) 100vw, 380px"
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Оставить отзыв" })).toBeInTheDocument();
    expect(
      screen
        .getByAltText("Дизайн привычных вещей")
        .getAttribute("src")
        ?.includes("design-of-everyday-things-9780441172719.jpg")
    ).toBe(true);
    expect(screen.getByText("Reader One")).toBeInTheDocument();
    expect(screen.getByText("Очень полезная книга о проектировании.")).toBeInTheDocument();
  });
});
