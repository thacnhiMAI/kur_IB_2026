import type { NormalizedImportedBook } from "@/lib/import/types";

function normalizeDedupeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildTitleAuthorYearKey(item: NormalizedImportedBook) {
  return [
    normalizeDedupeText(item.title),
    item.authors.map((author) => normalizeDedupeText(author)).join("|"),
    String(item.year)
  ].join("::");
}

function buildKeys(item: NormalizedImportedBook) {
  const keys: string[] = [];

  if (item.isbn13) {
    keys.push(`isbn13:${item.isbn13.trim()}`);
  }

  if (item.isbn10) {
    keys.push(`isbn10:${item.isbn10.trim()}`);
  }

  keys.push(`fallback:${buildTitleAuthorYearKey(item)}`);

  return keys;
}

function mergeUnique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function pickDescription(current: string, incoming: string) {
  return incoming.length > current.length ? incoming : current;
}

function mergeImportedBooks(
  current: NormalizedImportedBook,
  incoming: NormalizedImportedBook
): NormalizedImportedBook {
  return {
    ...current,
    subtitle: current.subtitle ?? incoming.subtitle,
    description: pickDescription(current.description, incoming.description),
    authors: mergeUnique([...current.authors, ...incoming.authors]),
    genres: mergeUnique([...current.genres, ...incoming.genres]),
    year: current.year || incoming.year,
    language: current.language !== "und" ? current.language : incoming.language,
    pages: current.pages ?? incoming.pages,
    publisher: current.publisher ?? incoming.publisher,
    isbn10: current.isbn10 ?? incoming.isbn10,
    isbn13: current.isbn13 ?? incoming.isbn13,
    coverUrl: current.coverUrl ?? incoming.coverUrl,
    ratingAverage: current.ratingAverage ?? incoming.ratingAverage,
    ratingsCount: current.ratingsCount ?? incoming.ratingsCount,
    sourceUrl: current.sourceUrl ?? incoming.sourceUrl
  };
}

export function dedupeImportedBooks(items: NormalizedImportedBook[]) {
  const deduped: NormalizedImportedBook[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const keys = buildKeys(item);
    const matchedIndex = keys.find((key) => indexByKey.has(key));

    if (matchedIndex === undefined) {
      const index = deduped.push(item) - 1;

      for (const key of keys) {
        indexByKey.set(key, index);
      }

      continue;
    }

    const existingIndex = indexByKey.get(matchedIndex);

    if (existingIndex === undefined) {
      continue;
    }

    const merged = mergeImportedBooks(deduped[existingIndex], item);
    deduped[existingIndex] = merged;

    for (const key of buildKeys(merged)) {
      indexByKey.set(key, existingIndex);
    }
  }

  return deduped;
}
