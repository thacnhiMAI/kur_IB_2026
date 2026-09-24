import type {
  GoogleBooksIndustryIdentifier,
  GoogleBooksVolume,
  NormalizedImportedBook,
  OpenLibrarySearchDoc
} from "@/lib/import/types";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized || undefined;
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeString(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

function normalizeLanguageCode(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return "und";
  }

  const match = normalized.match(/[a-z]{2,3}$/i);

  return (match?.[0] ?? normalized).toLowerCase();
}

function normalizeIsbn(value: unknown) {
  const normalized = normalizeString(value)?.replace(/[^0-9X]/gi, "").toUpperCase();

  return normalized || undefined;
}

function extractIsbnPair(identifiers: unknown[]) {
  let isbn10: string | undefined;
  let isbn13: string | undefined;

  for (const identifier of identifiers) {
    const normalized = normalizeIsbn(identifier);

    if (!normalized) {
      continue;
    }

    if (!isbn13 && /^\d{13}$/.test(normalized)) {
      isbn13 = normalized;
      continue;
    }

    if (!isbn10 && /^[0-9]{9}[0-9X]$/.test(normalized)) {
      isbn10 = normalized;
    }
  }

  return { isbn10, isbn13 };
}

function extractGoogleIsbnPair(identifiers: GoogleBooksIndustryIdentifier[] | undefined) {
  if (!identifiers?.length) {
    return { isbn10: undefined, isbn13: undefined };
  }

  const ordered = identifiers
    .map((identifier) => ({
      type: normalizeString(identifier.type)?.toUpperCase(),
      identifier: normalizeIsbn(identifier.identifier)
    }))
    .filter((identifier) => identifier.identifier);

  const isbn13 =
    ordered.find((identifier) => identifier.type === "ISBN_13")?.identifier ??
    ordered.find((identifier) => identifier.identifier && /^\d{13}$/.test(identifier.identifier))
      ?.identifier;

  const isbn10 =
    ordered.find((identifier) => identifier.type === "ISBN_10")?.identifier ??
    ordered.find((identifier) => identifier.identifier && /^[0-9]{9}[0-9X]$/.test(identifier.identifier))
      ?.identifier;

  return { isbn10, isbn13 };
}

function parsePublishedYear(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= 2100) {
    return value;
  }

  const normalized = normalizeString(value);
  const match = normalized?.match(/\b(1\d{3}|20\d{2}|2100)\b/);

  if (!match) {
    throw new Error("Imported book is missing a usable publication year.");
  }

  return Number(match[1]);
}

function buildFallbackDescription(title: string, providerLabel: string) {
  return `${title} metadata imported from ${providerLabel}.`;
}

function normalizeDescription({
  title,
  providerLabel,
  candidates
}: {
  title: string;
  providerLabel: string;
  candidates: unknown[];
}) {
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return buildFallbackDescription(title, providerLabel);
}

function buildOpenLibraryCoverUrl(coverId: unknown) {
  if (typeof coverId !== "number" || !Number.isFinite(coverId)) {
    return undefined;
  }

  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

function buildGoogleCoverUrl(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.replace(/^http:\/\//i, "https://");
}

function requireTitle(value: unknown, providerLabel: string) {
  const title = normalizeString(value);

  if (!title) {
    throw new Error(`${providerLabel} record is missing a title.`);
  }

  return title;
}

export function normalizeOpenLibraryBook(payload: OpenLibrarySearchDoc): NormalizedImportedBook {
  const title = requireTitle(payload.title, "Open Library");
  const isbn = extractIsbnPair(payload.isbn ?? []);

  return {
    title,
    subtitle: normalizeString(payload.subtitle),
    description: normalizeDescription({
      title,
      providerLabel: "Open Library",
      candidates: []
    }),
    authors: normalizeStringList(payload.author_name),
    genres: normalizeStringList(payload.subject),
    year: parsePublishedYear(payload.first_publish_year),
    language: normalizeLanguageCode(payload.language?.[0]),
    pages:
      typeof payload.number_of_pages_median === "number" &&
      Number.isInteger(payload.number_of_pages_median) &&
      payload.number_of_pages_median > 0
        ? payload.number_of_pages_median
        : undefined,
    publisher: normalizeString(payload.publisher?.[0]),
    isbn10: isbn.isbn10,
    isbn13: isbn.isbn13,
    coverUrl: buildOpenLibraryCoverUrl(payload.cover_i),
    ratingAverage:
      typeof payload.ratings_average === "number" ? payload.ratings_average : undefined,
    ratingsCount: typeof payload.ratings_count === "number" ? payload.ratings_count : undefined,
    provider: "open-library",
    externalId: normalizeString(payload.key)?.replace(/^\/works\//, "") ?? title,
    sourceUrl: normalizeString(payload.key)
      ? `https://openlibrary.org${normalizeString(payload.key)}`
      : undefined
  };
}

export function normalizeGoogleBook(payload: GoogleBooksVolume): NormalizedImportedBook {
  const volumeInfo = payload.volumeInfo ?? {};
  const title = requireTitle(volumeInfo.title, "Google Books");
  const isbn = extractGoogleIsbnPair(volumeInfo.industryIdentifiers);

  return {
    title,
    subtitle: normalizeString(volumeInfo.subtitle),
    description: normalizeDescription({
      title,
      providerLabel: "Google Books",
      candidates: [volumeInfo.description, payload.searchInfo?.textSnippet, volumeInfo.subtitle]
    }),
    authors: normalizeStringList(volumeInfo.authors),
    genres: normalizeStringList(volumeInfo.categories),
    year: parsePublishedYear(volumeInfo.publishedDate),
    language: normalizeLanguageCode(volumeInfo.language),
    pages:
      typeof volumeInfo.pageCount === "number" &&
      Number.isInteger(volumeInfo.pageCount) &&
      volumeInfo.pageCount > 0
        ? volumeInfo.pageCount
        : undefined,
    publisher: normalizeString(volumeInfo.publisher),
    isbn10: isbn.isbn10,
    isbn13: isbn.isbn13,
    coverUrl: buildGoogleCoverUrl(volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail),
    ratingAverage: typeof volumeInfo.averageRating === "number" ? volumeInfo.averageRating : undefined,
    ratingsCount: typeof volumeInfo.ratingsCount === "number" ? volumeInfo.ratingsCount : undefined,
    provider: "google-books",
    externalId: normalizeString(payload.id) ?? title,
    sourceUrl: normalizeString(volumeInfo.infoLink ?? volumeInfo.canonicalVolumeLink)
  };
}
