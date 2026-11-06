import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogBookRecord } from "@/lib/catalog/queries";

const { bookFindMany, genreFindMany, authorFindMany, progressFindMany, auth } = vi.hoisted(() => ({
  bookFindMany: vi.fn(),
  genreFindMany: vi.fn(),
  authorFindMany: vi.fn(),
  progressFindMany: vi.fn(),
  auth: vi.fn()
}));

vi.mock("@/auth", () => ({ auth }));

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      findMany: bookFindMany
    },
    genre: {
      findMany: genreFindMany
    },
    author: {
      findMany: authorFindMany
    },
    readingProgress: {
      findMany: progressFindMany
    }
  }
}));

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/catalog",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams()
}));

import CatalogPage from "@/app/catalog/page";
import { getCatalogPageData } from "@/lib/catalog/service";

function createCatalogBook(
  overrides: Partial<CatalogBookRecord> & {
    coverAsset?: {
      publicUrl: string;
      dominantColor: string | null;
      blurDataUrl: string | null;
      status?: string;
    } | null;
  } = {}
) {
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
    isFeatured: false,
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

describe("CatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
    progressFindMany.mockResolvedValue([]);
  });

  it("renders the premium catalog hero, shelf, and 3d card hooks", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    bookFindMany
      .mockResolvedValueOnce([
        createCatalogBook({
          isFeatured: true,
          coverAsset: {
            publicUrl: "/covers/design-of-everyday-things-9780441172719.jpg",
            dominantColor: "#112233",
            blurDataUrl: "data:image/jpeg;base64,AAA="
          }
        })
      ])
      .mockResolvedValueOnce([createCatalogBook({ isFeatured: true })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ year: 2013 }]);
    genreFindMany.mockResolvedValue([{ slug: "dizayn", name: "Дизайн" }]);
    authorFindMany.mockResolvedValue([{ slug: "don-norman", name: "Дон Норман" }]);
    progressFindMany.mockResolvedValue([
      {
        bookId: "book-1",
        progressPercent: 42,
        completedAt: null
      }
    ]);

    render(await CatalogPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /^Каталог$/ })).toBeInTheDocument();
    expect(screen.getAllByText("Дизайн привычных вещей").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дон Норман").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Дизайн привычных вещей" }).length).toBeGreaterThan(0);
    expect(screen.getByTestId("featured-shelf")).toBeInTheDocument();
    expect(screen.getAllByTestId("book-card-3d")).not.toHaveLength(0);
    expect(screen.getAllByTestId("catalog-reading-dot").find((dot) => !dot.classList.contains("hidden"))).toHaveClass("bg-amber-300");
    expect(screen.getAllByAltText("Дизайн привычных вещей")[0]).toHaveAttribute(
      "sizes"
    );
    expect(
      screen
        .getAllByAltText("Дизайн привычных вещей")
        .some((image) =>
          image
            .getAttribute("src")
            ?.includes("design-of-everyday-things-9780441172719.jpg")
        )
    ).toBe(true);
  });

  it("returns featured books with cached cover assets from the catalog service", async () => {
    bookFindMany
      .mockResolvedValueOnce([
        createCatalogBook({
          isFeatured: true,
          coverAsset: {
            publicUrl: "/covers/design-of-everyday-things-9780441172719.jpg",
            dominantColor: "#112233",
            blurDataUrl: "data:image/jpeg;base64,AAA="
          }
        }),
        createCatalogBook({
          id: "book-2",
          slug: "clean-code",
          title: "Clean Code",
          year: 2008,
          isFeatured: false
        })
      ])
      .mockResolvedValueOnce([createCatalogBook({ isFeatured: true })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ year: 2013 }, { year: 2008 }]);
    genreFindMany.mockResolvedValue([{ slug: "dizayn", name: "Дизайн" }]);
    authorFindMany.mockResolvedValue([{ slug: "don-norman", name: "Дон Норман" }]);

    const data = await getCatalogPageData({});

    expect(data.featuredBooks).toHaveLength(1);
    expect(data.featuredBooks[0]).toMatchObject({
      title: "Дизайн привычных вещей",
      coverImage: "https://example.com/original-cover.jpg",
      isFeatured: true
    });
    expect(data.books[0].coverImage).toBe("/covers/design-of-everyday-things-9780441172719.jpg");
  });

  it("updates the server query from the shared search bar", async () => {
    bookFindMany
      .mockResolvedValueOnce([
        createCatalogBook({
          isFeatured: true,
          coverAsset: {
            publicUrl: "/covers/design-of-everyday-things-9780441172719.jpg",
            dominantColor: "#112233",
            blurDataUrl: "data:image/jpeg;base64,AAA="
          }
        }),
        createCatalogBook({
          id: "book-2",
          slug: "clean-code",
          title: "Clean Code",
          subtitle: null,
          description: "Code craftsmanship.",
          year: 2008,
          authors: [
            {
              author: {
                slug: "robert-martin",
                name: "Robert Martin"
              }
            }
          ],
          genres: [
            {
              genre: {
                slug: "engineering",
                name: "Engineering"
              }
            }
          ]
        })
      ])
      .mockResolvedValueOnce([createCatalogBook({ isFeatured: true })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ year: 2013 }, { year: 2008 }]);
    genreFindMany.mockResolvedValue([
      { slug: "dizayn", name: "Дизайн" },
      { slug: "engineering", name: "Engineering" }
    ]);
    authorFindMany.mockResolvedValue([
      { slug: "don-norman", name: "Дон Норман" },
      { slug: "robert-martin", name: "Robert Martin" }
    ]);

    render(await CatalogPage({ searchParams: Promise.resolve({}) }));

    const search = screen.getByPlaceholderText(
      "Название, автор, жанр или описание"
    );

    fireEvent.change(search, { target: { value: "Норман" } });

    expect(screen.getAllByText("Дизайн привычных вещей").length).toBeGreaterThan(0);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/catalog?q=${encodeURIComponent("Норман")}#catalog-results`, { scroll: false }));
  });
});
