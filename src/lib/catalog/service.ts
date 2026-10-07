import type { Prisma } from "@prisma/client";

import { toCatalogBookCard, toCatalogBookDetail } from "@/lib/books/presenters";
import { db } from "@/lib/db";

import type {
  CatalogBookDetail,
  CatalogBookRecord,
  CatalogPageData,
  CatalogSearchParams
} from "@/lib/catalog/queries";

const CATALOG_PAGE_SIZE = 25;
const FILTER_OPTION_LIMIT = 100;

const catalogBookInclude = {
  authors: { include: { author: true } },
  genres: { include: { genre: true } },
  contents: {
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }]
  },
  coverAssets: {
    where: { status: "ready" },
    orderBy: { lastFetchedAt: "desc" },
    take: 1
  }
} satisfies Prisma.BookInclude;

function buildCatalogWhere(params: CatalogSearchParams): Prisma.BookWhereInput {
  const textSearch = params.q?.trim();
  const year = params.year ? Number(params.year) : undefined;

  return {
    isPublished: true,
    AND: [
      textSearch
        ? {
            OR: [
              { title: { contains: textSearch, mode: "insensitive" } },
              { subtitle: { contains: textSearch, mode: "insensitive" } },
              { description: { contains: textSearch, mode: "insensitive" } },
              {
                authors: {
                  some: {
                    author: { name: { contains: textSearch, mode: "insensitive" } }
                  }
                }
              },
              {
                genres: {
                  some: {
                    genre: { name: { contains: textSearch, mode: "insensitive" } }
                  }
                }
              }
            ]
          }
        : {},
      params.genre
        ? {
            genres: {
              some: { genre: { slug: params.genre } }
            }
          }
        : {},
      params.author
        ? {
            authors: {
              some: { author: { slug: params.author } }
            }
          }
        : {},
      year ? { year } : {}
    ]
  };
}

function withCursorBoundary(
  where: Prisma.BookWhereInput,
  cursor: string | undefined,
  direction: "next" | "prev"
): Prisma.BookWhereInput {
  if (!cursor) {
    return where;
  }

  return {
    AND: [
      where,
      {
        id: direction === "prev" ? { lt: cursor } : { gt: cursor }
      }
    ]
  };
}

export async function getCatalogPageData(params: CatalogSearchParams): Promise<CatalogPageData> {
  const cursor = params.cursor?.trim() || undefined;
  const direction = params.direction === "prev" ? "prev" : "next";
  const baseWhere = buildCatalogWhere(params);
  const pageWhere = withCursorBoundary(baseWhere, cursor, direction);

  const [pageRaw, featuredRaw, featuredFallbackRaw, genres, authors, yearsRaw] = await Promise.all([
    db.book.findMany({
      where: pageWhere,
      include: catalogBookInclude,
      orderBy: { id: direction === "prev" ? "desc" : "asc" },
      take: CATALOG_PAGE_SIZE + 1
    }),
    db.book.findMany({
      where: {
        isPublished: true,
        isFeatured: true
      },
      include: catalogBookInclude,
      orderBy: [{ year: "desc" }, { title: "asc" }],
      take: 6
    }),
    db.book.findMany({
      where: { isPublished: true },
      include: catalogBookInclude,
      orderBy: [{ year: "desc" }, { title: "asc" }],
      take: 12
    }),
    db.genre.findMany({
      where: {
        books: {
          some: {
            book: {
              isPublished: true
            }
          }
        }
      },
      orderBy: { name: "asc" },
      take: FILTER_OPTION_LIMIT
    }),
    db.author.findMany({
      where: {
        books: {
          some: {
            book: {
              isPublished: true
            }
          }
        }
      },
      orderBy: { name: "asc" },
      take: FILTER_OPTION_LIMIT
    }),
    db.book.findMany({
      where: { isPublished: true },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
      take: 200
    })
  ]);

  const hasExtraItem = pageRaw.length > CATALOG_PAGE_SIZE;
  const pageSlice = pageRaw.slice(0, CATALOG_PAGE_SIZE);
  const orderedPage = direction === "prev" ? [...pageSlice].reverse() : pageSlice;
  const books = orderedPage.map((book) => toCatalogBookCard(book as CatalogBookRecord));
  const featuredIds = new Set(featuredRaw.map((book) => book.id));
  const stableFeaturedRaw = [
    ...featuredRaw,
    ...featuredFallbackRaw.filter((book) => !featuredIds.has(book.id))
  ].slice(0, 6);
  const featuredBooks = stableFeaturedRaw.map((book) =>
    toCatalogBookCard(book as CatalogBookRecord)
  );

  const hasPreviousPage = direction === "prev" ? hasExtraItem : Boolean(cursor);
  const hasNextPage = direction === "prev" ? Boolean(cursor) : hasExtraItem;
  const firstBookId = books[0]?.id ?? null;
  const lastBookId = books.length > 0 ? books[books.length - 1]!.id : null;

  return {
    books,
    featuredBooks,
    filters: {
      genres: genres.map((genre) => ({ slug: genre.slug, name: genre.name })),
      authors: authors.map((author) => ({ slug: author.slug, name: author.name })),
      years: yearsRaw.map((item) => item.year)
    },
    pagination: {
      pageSize: CATALOG_PAGE_SIZE,
      hasNextPage,
      hasPreviousPage,
      nextCursor: hasNextPage ? lastBookId : null,
      previousCursor: hasPreviousPage ? firstBookId : null
    }
  };
}

export async function getBookDetailPageData(slug: string): Promise<CatalogBookDetail | null> {
  const book = await db.book.findFirst({
    where: {
      slug,
      isPublished: true
    },
    include: catalogBookInclude
  });

  if (!book) {
    return null;
  }

  return toCatalogBookDetail(book as CatalogBookRecord);
}
