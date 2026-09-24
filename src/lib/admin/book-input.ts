import { bookSchema } from "@/lib/validators/book";

type BookBaseInput = {
  title: string;
  subtitle?: unknown;
  originalTitle?: unknown;
  slug: string;
  description: string;
  coverImage?: unknown;
  year: number;
  isbn?: unknown;
  isbn10?: unknown;
  isbn13?: unknown;
  publisher?: unknown;
  edition?: unknown;
  language: string;
  pages: number;
  isFeatured?: unknown;
  isPublished?: unknown;
};

function normalizeIdList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized ? normalized : undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "off", "no", ""].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

export function parseBookPayload(input: BookBaseInput & { authorIds?: unknown; genreIds?: unknown }) {
  const parsed = bookSchema.parse({
    title: input.title,
    subtitle: normalizeOptionalString(input.subtitle),
    originalTitle: normalizeOptionalString(input.originalTitle),
    slug: input.slug,
    description: input.description,
    coverImage: normalizeOptionalString(input.coverImage) ?? "",
    year: input.year,
    isbn: normalizeOptionalString(input.isbn),
    isbn10: normalizeOptionalString(input.isbn10),
    isbn13: normalizeOptionalString(input.isbn13),
    publisher: normalizeOptionalString(input.publisher),
    edition: normalizeOptionalString(input.edition),
    language: input.language,
    pages: input.pages,
    isFeatured: normalizeBoolean(input.isFeatured, false),
    isPublished: normalizeBoolean(input.isPublished, true)
  });

  return {
    ...parsed,
    authorIds: normalizeIdList(input.authorIds),
    genreIds: normalizeIdList(input.genreIds)
  };
}
