import type {
  CatalogBookCard,
  CatalogBookDetail,
  CatalogBookRecord
} from "@/lib/catalog/queries";
import { buildARBookPayload } from "@/lib/ar/payload";

const DEFAULT_BOOK_COLOR = "#0F172A";

function getPrimaryCover(book: Pick<CatalogBookRecord, "coverAssets">) {
  return book.coverAssets[0] ?? null;
}

export function toCatalogBookCard(book: CatalogBookRecord): CatalogBookCard {
  const primaryCover = getPrimaryCover(book);

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    year: book.year,
    coverImage: primaryCover?.publicUrl ?? book.coverImage,
    dominantColor: primaryCover?.dominantColor ?? DEFAULT_BOOK_COLOR,
    blurDataUrl: primaryCover?.blurDataUrl ?? null,
    authors: book.authors.map((item) => item.author.name),
    genres: book.genres.map((item) => item.genre.name),
    isFeatured: book.isFeatured
  };
}

export function toCatalogBookDetail(book: CatalogBookRecord): CatalogBookDetail {
  const primaryCover = getPrimaryCover(book);

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    year: book.year,
    coverImage: primaryCover?.publicUrl ?? book.coverImage,
    dominantColor: primaryCover?.dominantColor ?? null,
    blurDataUrl: primaryCover?.blurDataUrl ?? null,
    authors: book.authors.map((item) => item.author.name),
    genres: book.genres.map((item) => item.genre.name),
    publisher: book.publisher,
    edition: book.edition,
    isbn13: book.isbn13,
    language: book.language,
    pages: book.pages,
    ratingAverage: book.ratingAverage,
    ratingsCount: book.ratingsCount,
    isFeatured: book.isFeatured
  };
}

export function toARBookPayload(book: CatalogBookDetail) {
  return buildARBookPayload({
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    coverImage: book.coverImage,
    dominantColor: book.dominantColor,
    authors: book.authors
  });
}
