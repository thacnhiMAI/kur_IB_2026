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

async function resetDatabase() {
  await prisma.recommendationItem.deleteMany();
  await prisma.recommendationSnapshot.deleteMany();
  await prisma.readingHistory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookAuthor.deleteMany();
  await prisma.bookGenre.deleteMany();
  await prisma.bookCoverAsset.deleteMany();
  await prisma.bookSourceRecord.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function createDemoUsers() {
  const adminPassword = await bcrypt.hash("Admin12345", 10);
  const userPassword = await bcrypt.hash("Reader12345", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: UserRole.ADMIN
    }
  });

  const user = await prisma.user.create({
    data: {
      name: "Reader",
      email: "reader@example.com",
      passwordHash: userPassword,
      role: UserRole.USER
    }
  });

  return { admin, user };
}

async function ensureDemoCatalogSlugs() {
  const localizedBooks = [
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
  ];

  for (const fallbackBook of fallbackImportedBooks) {
    await upsertImportedBook(fallbackBook);
  }

  for (const book of localizedBooks) {
    await prisma.book.update({
      where: {
        slug: book.slug
      },
      data: {
        title: book.title,
        description: book.description,
        language: book.language
      }
    });
  }
}

async function createDemoEngagement(userId: string) {
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

  await prisma.favorite.create({
    data: {
      userId,
      bookId: designBook.id
    }
  });

  await prisma.review.create({
    data: {
      userId,
      bookId: designBook.id,
      rating: 5,
      content: "Очень полезная книга для понимания UX и пользовательского мышления.",
      status: ReviewStatus.PUBLISHED
    }
  });

  await prisma.readingHistory.createMany({
    data: [
      { userId, bookId: designBook.id, eventType: ReadingEventType.FINISHED },
      { userId, bookId: foundationBook.id, eventType: ReadingEventType.INTERESTED },
      { userId, bookId: thronesBook.id, eventType: ReadingEventType.VIEWED }
    ]
  });

  return {
    designBookSlug: designBook.slug,
    foundationBookSlug: foundationBook.slug,
    thronesBookSlug: thronesBook.slug
  };
}

async function main() {
  await resetDatabase();

  const { admin, user } = await createDemoUsers();

  const importReport = await importBooksFromProviders({
    queries: DEFAULT_IMPORT_QUERIES
  });

  console.log(formatImportReport(importReport));

  await ensureDemoCatalogSlugs();

  const engagement = await createDemoEngagement(user.id);

  console.log({
    adminEmail: admin.email,
    readerEmail: user.email,
    demoBooks: [
      engagement.designBookSlug,
      engagement.foundationBookSlug,
      engagement.thronesBookSlug
    ]
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
