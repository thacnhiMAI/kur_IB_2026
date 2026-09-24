import crypto from "node:crypto";

import { db } from "@/lib/db";
import { cacheCoverAsset } from "@/lib/books/cover-assets";
import type { ImportUpsertResult } from "@/lib/import/report";
import type { NormalizedImportedBook } from "@/lib/import/types";

const DEFAULT_PAGE_COUNT = 100;

type ImportDbClient = Pick<
  typeof db,
  "author" | "book" | "bookAuthor" | "bookGenre" | "bookSourceRecord" | "genre"
>;

function normalizeRelationSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleSlug(value: string) {
  const slug = normalizeRelationSlug(value);

  return slug || "book";
}

function buildBookIdentifier(input: NormalizedImportedBook) {
  return input.isbn13 ?? input.isbn10 ?? `${input.provider}-${input.externalId}`;
}

function buildRawChecksum(input: NormalizedImportedBook) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function toRawPayload(input: NormalizedImportedBook) {
  return JSON.parse(JSON.stringify(input));
}

async function ensureUniqueBookSlug(
  client: ImportDbClient,
  baseSlug: string,
  existingBookId?: string
) {
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await client.book.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existing || existing.id === existingBookId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function resolveExistingBook(client: ImportDbClient, input: NormalizedImportedBook) {
  const sourceRecord = await client.bookSourceRecord.findUnique({
    where: {
      provider_externalId: {
        provider: input.provider,
        externalId: input.externalId
      }
    },
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          originalTitle: true,
          description: true,
          coverImage: true,
          year: true,
          isbn10: true,
          isbn13: true,
          publisher: true,
          edition: true,
          language: true,
          pages: true,
          ratingAverage: true,
          ratingsCount: true,
          sourcePrimary: true,
          sourceExternalId: true
        }
      }
    }
  });

  if (sourceRecord?.book) {
    return {
      book: sourceRecord.book,
      sourceRecord
    };
  }

  if (input.isbn13) {
    const book = await client.book.findUnique({
      where: { isbn13: input.isbn13 },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        originalTitle: true,
        description: true,
        coverImage: true,
        year: true,
        isbn10: true,
        isbn13: true,
        publisher: true,
        edition: true,
        language: true,
        pages: true,
        ratingAverage: true,
        ratingsCount: true,
        sourcePrimary: true,
        sourceExternalId: true
      }
    });

    if (book) {
      return { book, sourceRecord: null };
    }
  }

  if (input.isbn10) {
    const book = await client.book.findUnique({
      where: { isbn10: input.isbn10 },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        originalTitle: true,
        description: true,
        coverImage: true,
        year: true,
        isbn10: true,
        isbn13: true,
        publisher: true,
        edition: true,
        language: true,
        pages: true,
        ratingAverage: true,
        ratingsCount: true,
        sourcePrimary: true,
        sourceExternalId: true
      }
    });

    if (book) {
      return { book, sourceRecord: null };
    }
  }

  const book = await client.book.findFirst({
    where: {
      title: input.title,
      year: input.year,
      authors: input.authors.length
        ? {
            some: {
              author: {
                name: {
                  in: input.authors
                }
              }
            }
          }
        : undefined
    },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      originalTitle: true,
      description: true,
      coverImage: true,
      year: true,
      isbn10: true,
      isbn13: true,
      publisher: true,
      edition: true,
      language: true,
      pages: true,
      ratingAverage: true,
      ratingsCount: true,
      sourcePrimary: true,
      sourceExternalId: true
    }
  });

  return {
    book,
    sourceRecord: null
  };
}

async function ensureAuthors(client: ImportDbClient, bookId: string, authors: string[]) {
  if (authors.length === 0) {
    return;
  }

  const authorIds: string[] = [];

  for (const name of authors) {
    const author = await client.author.upsert({
      where: {
        slug: normalizeRelationSlug(name)
      },
      update: {
        name
      },
      create: {
        name,
        slug: normalizeRelationSlug(name)
      },
      select: {
        id: true
      }
    });

    authorIds.push(author.id);
  }

  await client.bookAuthor.createMany({
    data: authorIds.map((authorId) => ({
      bookId,
      authorId
    })),
    skipDuplicates: true
  });
}

async function ensureGenres(client: ImportDbClient, bookId: string, genres: string[]) {
  if (genres.length === 0) {
    return;
  }

  const genreIds: string[] = [];

  for (const name of genres) {
    const genre = await client.genre.upsert({
      where: {
        slug: normalizeRelationSlug(name)
      },
      update: {
        name
      },
      create: {
        name,
        slug: normalizeRelationSlug(name)
      },
      select: {
        id: true
      }
    });

    genreIds.push(genre.id);
  }

  await client.bookGenre.createMany({
    data: genreIds.map((genreId) => ({
      bookId,
      genreId
    })),
    skipDuplicates: true
  });
}

function buildCreateData(input: NormalizedImportedBook, slug: string) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    originalTitle: input.originalTitle ?? null,
    slug,
    description: input.description,
    coverImage: input.coverUrl ?? null,
    year: input.year,
    isbn10: input.isbn10,
    isbn13: input.isbn13,
    publisher: input.publisher,
    language: input.language,
    pages: input.pages ?? DEFAULT_PAGE_COUNT,
    ratingAverage: input.ratingAverage,
    ratingsCount: input.ratingsCount,
    sourcePrimary: input.provider,
    sourceExternalId: input.externalId,
    isPublished: true,
    publishedAt: new Date()
  };
}

function buildUpdateData(
  existingBook: Awaited<ReturnType<typeof resolveExistingBook>>["book"],
  input: NormalizedImportedBook
) {
  return {
    title: existingBook?.title || input.title,
    subtitle: existingBook?.subtitle ?? input.subtitle,
    originalTitle: existingBook?.originalTitle ?? input.originalTitle,
    description: existingBook?.description || input.description,
    coverImage: existingBook?.coverImage,
    year: existingBook?.year || input.year,
    isbn10: existingBook?.isbn10 ?? input.isbn10,
    isbn13: existingBook?.isbn13 ?? input.isbn13,
    publisher: existingBook?.publisher ?? input.publisher,
    language: existingBook?.language || input.language,
    pages: existingBook?.pages || input.pages || DEFAULT_PAGE_COUNT,
    ratingAverage: existingBook?.ratingAverage ?? input.ratingAverage,
    ratingsCount: existingBook?.ratingsCount ?? input.ratingsCount,
    sourcePrimary: existingBook?.sourcePrimary ?? input.provider,
    sourceExternalId: existingBook?.sourceExternalId ?? input.externalId
  };
}

export async function upsertImportedBook(
  input: NormalizedImportedBook
): Promise<ImportUpsertResult> {
  const checksum = buildRawChecksum(input);
  const rawPayload = toRawPayload(input);
  const initialCoverStatus: ImportUpsertResult["coverStatus"] = input.coverUrl
    ? "ready"
    : "missing";
  const persisted = await db.$transaction(async (tx) => {
    const resolved = await resolveExistingBook(tx, input);
    const resultKind: ImportUpsertResult["kind"] = resolved.book ? "updated" : "added";

    if (resolved.sourceRecord?.rawChecksum === checksum && resolved.book) {
      return {
        kind: "skipped" as const,
        bookId: resolved.book.id,
        bookSlug: resolved.book.slug,
        coverStatus: initialCoverStatus
      };
    }

    const slug = await ensureUniqueBookSlug(
      tx,
      resolved.book?.slug ?? toTitleSlug(input.title),
      resolved.book?.id
    );

    const book = resolved.book
      ? await tx.book.update({
          where: {
            id: resolved.book.id
          },
          data: buildUpdateData(resolved.book, input),
          select: {
            id: true,
            slug: true
          }
        })
      : await tx.book.create({
          data: buildCreateData(input, slug),
          select: {
            id: true,
            slug: true
          }
        });

    await ensureAuthors(tx, book.id, input.authors);
    await ensureGenres(tx, book.id, input.genres);
    await tx.bookSourceRecord.upsert({
      where: {
        provider_externalId: {
          provider: input.provider,
          externalId: input.externalId
        }
      },
      update: {
        bookId: book.id,
        sourceUrl: input.sourceUrl,
        rawChecksum: checksum,
        rawPayload,
        lastImportedAt: new Date()
      },
      create: {
        bookId: book.id,
        provider: input.provider,
        externalId: input.externalId,
        sourceUrl: input.sourceUrl,
        rawChecksum: checksum,
        rawPayload
      }
    });

    return {
      kind: resultKind,
      bookId: book.id,
      bookSlug: book.slug,
      coverStatus: initialCoverStatus
    };
  });

  if (persisted.kind === "skipped" || !input.coverUrl) {
    return persisted;
  }

  try {
    const asset = await cacheCoverAsset({
      slug: persisted.bookSlug,
      identifier: buildBookIdentifier(input),
      url: input.coverUrl
    });
    const existingAsset = await db.bookCoverAsset.findFirst({
      where: {
        bookId: persisted.bookId,
        originalUrl: input.coverUrl
      },
      select: {
        id: true
      }
    });

    if (existingAsset) {
      await db.bookCoverAsset.update({
        where: {
          id: existingAsset.id
        },
        data: {
          cachedPath: asset.cachedPath,
          publicUrl: asset.publicUrl,
          width: asset.width,
          height: asset.height,
          dominantColor: asset.dominantColor,
          blurDataUrl: asset.blurDataUrl,
          status: "ready",
          lastFetchedAt: new Date()
        }
      });
    } else {
      await db.bookCoverAsset.create({
        data: {
          bookId: persisted.bookId,
          originalUrl: input.coverUrl,
          cachedPath: asset.cachedPath,
          publicUrl: asset.publicUrl,
          width: asset.width,
          height: asset.height,
          dominantColor: asset.dominantColor,
          blurDataUrl: asset.blurDataUrl,
          status: "ready"
        }
      });
    }

    await db.book.update({
      where: {
        id: persisted.bookId
      },
      data: {
        coverImage: asset.publicUrl
      }
    });

    return {
      kind: persisted.kind,
      bookId: persisted.bookId,
      bookSlug: persisted.bookSlug,
      coverStatus: "ready"
    };
  } catch {
    return {
      kind: persisted.kind,
      bookId: persisted.bookId,
      bookSlug: persisted.bookSlug,
      coverStatus: "failed"
    };
  }
}
