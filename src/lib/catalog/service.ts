import type { Prisma } from "@prisma/client";

import { selectFeaturedBooks } from "@/lib/books/featured";
import { toCatalogBookCard, toCatalogBookDetail } from "@/lib/books/presenters";
import { db } from "@/lib/db";

import type {
  CatalogBookDetail,
  CatalogBookRecord,
  CatalogPageData,
  CatalogSearchParams
} from "@/lib/catalog/queries";

const catalogBookInclude = {
  authors: { include: { author: true } },
  genres: { include: { genre: true } },
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
              {
                authors: {
                  some: {
                    author: { name: { contains: textSearch, mode: "insensitive" } }
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

export async function getCatalogPageData(params: CatalogSearchParams): Promise<CatalogPageData> {
  const books = await db.book.findMany({
    where: buildCatalogWhere(params),
    include: catalogBookInclude,
    orderBy: [{ isFeatured: "desc" }, { year: "desc" }, { title: "asc" }]
  });

  const [genres, authors, yearsRaw] = await Promise.all([
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
      orderBy: { name: "asc" }
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
      orderBy: { name: "asc" }
    }),
    db.book.findMany({
      where: { isPublished: true },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" }
    })
  ]);

  const bookCards = books.map((book) => toCatalogBookCard(book as CatalogBookRecord));

  return {
    books: bookCards,
    featuredBooks: selectFeaturedBooks(bookCards),
    filters: {
      genres: genres.map((genre) => ({ slug: genre.slug, name: genre.name })),
      authors: authors.map((author) => ({ slug: author.slug, name: author.name })),
      years: yearsRaw.map((item) => item.year)
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
