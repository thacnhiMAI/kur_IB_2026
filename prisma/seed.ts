import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient, ReadingEventType, ReviewStatus, UserRole } from "@prisma/client";

import {
  DEFAULT_IMPORT_QUERIES,
  importBooksFromProviders
} from "../src/lib/import/service";
import { formatImportReport } from "../src/lib/import/report";
import { upsertImportedBook } from "../src/lib/import/upsert";
import type { NormalizedImportedBook } from "../src/lib/import/types";

const prisma = new PrismaClient();

const DEMO_BOOK_SLUGS = [
  "design-of-everyday-things",
  "foundation",
  "game-of-thrones"
] as const;

const fallbackImportedBooks: NormalizedImportedBook[] = [
  {
    title: "Design of Everyday Things",
    description: "Classic book about design, UX, and understandable interfaces.",
    authors: ["Don Norman"],
    genres: ["Design"],
    year: 2013,
    language: "en",
    pages: 384,
    isbn13: "9780465050659",
    publisher: "Basic Books",
    provider: "open-library",
    externalId: "OL-design-of-everyday-things"
  },
  {
    title: "Foundation",
    description: "Classic science fiction about the future of civilization and psychohistory.",
    authors: ["Isaac Asimov"],
    genres: ["Science Fiction", "Science"],
    year: 1951,
    language: "en",
    pages: 320,
    isbn13: "9780553293357",
    publisher: "Spectra",
    provider: "open-library",
    externalId: "OL-foundation"
  },
  {
    title: "Game of Thrones",
    description: "Epic fantasy novel about power, family, and the fight for the Iron Throne.",
    authors: ["George R. R. Martin"],
    genres: ["Fantasy"],
    year: 1996,
    language: "en",
    pages: 768,
    isbn13: "9780553103540",
    publisher: "Bantam Spectra",
    provider: "open-library",
    externalId: "OL-game-of-thrones"
  }
];

const localizedDemoBooks = [
  {
    slug: "design-of-everyday-things",
    title: "Дизайн привычных вещей",
    description: "Классическая книга о проектировании, UX и понятных интерфейсах.",
    language: "ru"
  },
  {
    slug: "foundation",
    title: "Основание",
    description: "Классика научной фантастики о будущем цивилизации и прогнозировании.",
    language: "ru"
  },
  {
    slug: "game-of-thrones",
    title: "Игра престолов",
    description: "Эпическое фэнтези о власти, семье и борьбе за Железный трон.",
    language: "ru"
  }
] as const;

async function ensureDemoUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existing) {
    if (!existing.emailVerified) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: new Date() }
      });
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      emailVerified: new Date()
    }
  });
}

async function ensureDemoUsers() {
  const admin = await ensureDemoUser({
    name: "Admin",
    email: "admin@example.com",
    password: "Admin12345",
    role: UserRole.ADMIN
  });

  const user = await ensureDemoUser({
    name: "Reader",
    email: "reader@example.com",
    password: "Reader12345",
    role: UserRole.USER
  });

  return { admin, user };
}

async function bootstrapRealCatalogIfEmpty() {
  const bookCount = await prisma.book.count();

  if (bookCount > 0) {
    console.log(`Catalog already contains ${bookCount} book(s); skipping external provider import.`);
    return false;
  }

  console.log("Catalog is empty; importing initial books from providers...");

  try {
    const importReport = await importBooksFromProviders({
      queries: DEFAULT_IMPORT_QUERIES
    });

    console.log(formatImportReport(importReport));
  } catch (error) {
    console.warn("Initial provider import failed; continuing with local fallback demo books.");
    console.warn(error);
  }

  return true;
}

async function ensureDemoCatalogSlugs({ localizeExisting }: { localizeExisting: boolean }) {
  for (let index = 0; index < fallbackImportedBooks.length; index += 1) {
    const fallbackBook = fallbackImportedBooks[index];
    const localizedBook = localizedDemoBooks[index];

    const existing = await prisma.book.findUnique({
      where: { slug: localizedBook.slug },
      select: { id: true }
    });

    let createdNow = false;

    if (!existing) {
      await upsertImportedBook(fallbackBook);
      createdNow = true;
    }

    if (createdNow || localizeExisting) {
      const book = await prisma.book.findUnique({
        where: { slug: localizedBook.slug },
        select: { id: true }
      });

      if (book) {
        await prisma.book.update({
          where: { id: book.id },
          data: {
            title: localizedBook.title,
            description: localizedBook.description,
            language: localizedBook.language
          }
        });
      }
    }
  }
}

async function ensureReadingEvent(input: {
  userId: string;
  bookId: string;
  eventType: ReadingEventType;
}) {
  const existing = await prisma.readingHistory.findFirst({
    where: input,
    select: { id: true }
  });

  if (!existing) {
    await prisma.readingHistory.create({
      data: input
    });
  }
}

async function ensureDemoEngagement(userId: string) {
  const books = await prisma.book.findMany({
    where: {
      slug: {
        in: [...DEMO_BOOK_SLUGS]
      }
    },
    select: {
      id: true,
      slug: true
    }
  });

  const designBook = books.find((book) => book.slug === "design-of-everyday-things");
  const foundationBook = books.find((book) => book.slug === "foundation");
  const thronesBook = books.find((book) => book.slug === "game-of-thrones");

  if (!designBook || !foundationBook || !thronesBook) {
    throw new Error("Seed bootstrap did not create the required demo books.");
  }

  await prisma.favorite.upsert({
    where: {
      userId_bookId: {
        userId,
        bookId: designBook.id
      }
    },
    create: {
      userId,
      bookId: designBook.id
    },
    update: {}
  });

  const existingDemoReview = await prisma.review.findFirst({
    where: {
      userId,
      bookId: designBook.id,
      content: "Очень полезная книга для понимания UX и пользовательского мышления."
    },
    select: { id: true }
  });

  if (!existingDemoReview) {
    await prisma.review.create({
      data: {
        userId,
        bookId: designBook.id,
        rating: 5,
        content: "Очень полезная книга для понимания UX и пользовательского мышления.",
        status: ReviewStatus.PUBLISHED
      }
    });
  }

  await Promise.all([
    ensureReadingEvent({
      userId,
      bookId: designBook.id,
      eventType: ReadingEventType.FINISHED
    }),
    ensureReadingEvent({
      userId,
      bookId: foundationBook.id,
      eventType: ReadingEventType.INTERESTED
    }),
    ensureReadingEvent({
      userId,
      bookId: thronesBook.id,
      eventType: ReadingEventType.VIEWED
    })
  ]);

  return {
    designBookSlug: designBook.slug,
    foundationBookSlug: foundationBook.slug,
    thronesBookSlug: thronesBook.slug
  };
}

async function main() {
  console.log("Running non-destructive demo bootstrap...");

  const catalogWasEmpty = await bootstrapRealCatalogIfEmpty();
  const { admin, user } = await ensureDemoUsers();

  await ensureDemoCatalogSlugs({
    localizeExisting: catalogWasEmpty
  });

  const engagement = await ensureDemoEngagement(user.id);

  const totalBooks = await prisma.book.count();

  console.log({
    adminEmail: admin.email,
    readerEmail: user.email,
    demoBooks: [
      engagement.designBookSlug,
      engagement.foundationBookSlug,
      engagement.thronesBookSlug
    ],
    totalBooks,
    note: "Existing books, uploaded PDFs, covers, users, reviews and progress were preserved."
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
