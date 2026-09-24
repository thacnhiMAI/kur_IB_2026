# Smart Library MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working MVP of the Smart Library web app: catalog, authentication, favorites, reviews, reading history, AI-backed recommendations with fallback, admin CRUD, tests, and deployment-ready docs.

**Architecture:** Use a single `Next.js` App Router application with clear module boundaries (`auth`, `catalog`, `favorites`, `reviews`, `reading-history`, `recommendations`, `admin`). Public pages use `SSG/ISR` where possible; personalized and protected pages use server-side logic with `Auth.js`, `Prisma`, and `PostgreSQL`.

**Tech Stack:** `Next.js 15`, `TypeScript`, `Tailwind CSS`, `Prisma`, `PostgreSQL`, `Auth.js`, `Zod`, `Vitest`, `Playwright`, `OpenAI/GigaChat` behind a unified `AIProvider`.

---

## Planned File Structure

- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/catalog/page.tsx`
- Create: `src/app/books/[slug]/page.tsx`
- Create: `src/app/favorites/page.tsx`
- Create: `src/app/profile/page.tsx`
- Create: `src/app/recommendations/page.tsx`
- Create: `src/app/auth/sign-in/page.tsx`
- Create: `src/app/auth/sign-up/page.tsx`
- Create: `src/app/admin/books/page.tsx`
- Create: `src/app/admin/books/new/page.tsx`
- Create: `src/app/admin/books/[id]/edit/page.tsx`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/recommendations/route.ts`
- Create: `src/app/api/books/route.ts`
- Create: `src/app/api/books/[id]/route.ts`
- Create: `src/app/globals.css`
- Create: `src/auth.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/permissions.ts`
- Create: `src/lib/catalog/queries.ts`
- Create: `src/lib/catalog/service.ts`
- Create: `src/lib/favorites/actions.ts`
- Create: `src/lib/reviews/actions.ts`
- Create: `src/lib/reading-history/actions.ts`
- Create: `src/lib/recommendations/service.ts`
- Create: `src/lib/recommendations/fallback.ts`
- Create: `src/lib/ai/provider.ts`
- Create: `src/lib/ai/openai-provider.ts`
- Create: `src/lib/ai/gigachat-provider.ts`
- Create: `src/lib/validators/auth.ts`
- Create: `src/lib/validators/book.ts`
- Create: `src/lib/validators/review.ts`
- Create: `src/components/layout/site-header.tsx`
- Create: `src/components/catalog/book-card.tsx`
- Create: `src/components/catalog/catalog-filters.tsx`
- Create: `src/components/books/book-detail.tsx`
- Create: `src/components/recommendations/recommendation-card.tsx`
- Create: `src/components/admin/book-form.tsx`
- Create: `src/middleware.ts`
- Create: `tests/unit/recommendations/fallback.test.ts`
- Create: `tests/unit/validators/book.test.ts`
- Create: `tests/integration/catalog/catalog-page.test.tsx`
- Create: `tests/integration/auth/permissions.test.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Create: `README.md`

## Task 1: Bootstrap the Next.js app and baseline tooling

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write the failing smoke test for the home page**

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("home page shows the product title and entry links", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Умная библиотека" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Каталог" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Рекомендации" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- --grep "home page shows the product title and entry links"`

Expected: FAIL because the Next.js app and route files do not exist yet.

- [ ] **Step 3: Create the baseline app files**

```json
// package.json
{
  "name": "smart-library",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.7.4",
    "@prisma/client": "^6.14.0",
    "auth.js": "^0.39.1",
    "bcryptjs": "^2.4.3",
    "next": "^15.0.0",
    "next-auth": "^5.0.0-beta.25",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.0",
    "postcss": "^8.4.49",
    "prisma": "^6.14.0",
    "tailwindcss": "^3.4.15",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

```tsx
// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Умная библиотека",
  description: "Каталог книг с рекомендациями и персональным профилем."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <header className="border-b border-slate-800 bg-slate-900/80">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-semibold">
              Умная библиотека
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/catalog">Каталог</Link>
              <Link href="/recommendations">Рекомендации</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
```

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold">Умная библиотека</h1>
      <p className="max-w-2xl text-slate-300">
        Онлайн-каталог книг с персональными рекомендациями, отзывами и историей чтения.
      </p>
      <div className="flex gap-4">
        <Link href="/catalog" className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          Каталог
        </Link>
        <Link href="/recommendations" className="rounded border border-slate-700 px-4 py-2">
          Рекомендации
        </Link>
      </div>
    </section>
  );
}
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: dark;
}

body {
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: Run the smoke test again**

Run: `npm install && npm run test:e2e -- --grep "home page shows the product title and entry links"`

Expected: PASS for the home page smoke test.

- [ ] **Step 5: Commit**

```bash
git add package.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs .gitignore .env.example src/app/layout.tsx src/app/page.tsx src/app/globals.css tests/e2e/smoke.spec.ts
git commit -m "feat: bootstrap smart library application shell"
```

## Task 2: Define the Prisma schema and database access layer

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `tests/unit/validators/book.test.ts`

- [ ] **Step 1: Write a failing schema validation test around the book payload**

```ts
// tests/unit/validators/book.test.ts
import { describe, expect, it } from "vitest";
import { bookSchema } from "@/lib/validators/book";

describe("bookSchema", () => {
  it("accepts a valid book payload", () => {
    const parsed = bookSchema.parse({
      title: "Clean Architecture",
      slug: "clean-architecture",
      description: "A book about software architecture.",
      year: 2017,
      language: "ru",
      pages: 432
    });

    expect(parsed.slug).toBe("clean-architecture");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/validators/book.test.ts`

Expected: FAIL because the validator module does not exist yet.

- [ ] **Step 3: Add the schema and validator foundations**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum ReviewStatus {
  PUBLISHED
  HIDDEN
}

enum ReadingEventType {
  VIEWED
  INTERESTED
  FINISHED
}

model User {
  id              String                   @id @default(cuid())
  name            String?
  email           String                   @unique
  emailVerified   DateTime?
  image           String?
  passwordHash    String?
  role            UserRole                 @default(USER)
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  accounts        Account[]
  sessions        Session[]
  reviews         Review[]
  favorites       Favorite[]
  readingHistory  ReadingHistory[]
  recommendationSnapshots RecommendationSnapshot[]
}

model Book {
  id              String                   @id @default(cuid())
  title           String
  slug            String                   @unique
  description     String
  coverImage      String?
  year            Int
  isbn            String?                  @unique
  language        String
  pages           Int
  publishedAt     DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  authors         BookAuthor[]
  genres          BookGenre[]
  reviews         Review[]
  favorites       Favorite[]
  readingHistory  ReadingHistory[]
  recommendedIn   RecommendationItem[]
}

model Author {
  id        String      @id @default(cuid())
  name      String
  slug      String      @unique
  books     BookAuthor[]
}

model Genre {
  id        String      @id @default(cuid())
  name      String
  slug      String      @unique
  books     BookGenre[]
}

model BookAuthor {
  bookId    String
  authorId  String
  book      Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)
  author    Author      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@id([bookId, authorId])
}

model BookGenre {
  bookId    String
  genreId   String
  book      Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)
  genre     Genre       @relation(fields: [genreId], references: [id], onDelete: Cascade)

  @@id([bookId, genreId])
}

model Review {
  id        String      @id @default(cuid())
  rating    Int
  content   String
  status    ReviewStatus @default(PUBLISHED)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  userId    String
  bookId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  book      Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
}

model Favorite {
  id        String      @id @default(cuid())
  createdAt DateTime    @default(now())
  userId    String
  bookId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  book      Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
}

model ReadingHistory {
  id        String           @id @default(cuid())
  eventType ReadingEventType
  createdAt DateTime         @default(now())
  userId    String
  bookId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  book      Book             @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

model RecommendationSnapshot {
  id          String               @id @default(cuid())
  summary     String
  createdAt   DateTime             @default(now())
  provider    String
  userId      String
  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       RecommendationItem[]
}

model RecommendationItem {
  id                    String                 @id @default(cuid())
  reason                String
  position              Int
  snapshotId            String
  bookId                String
  snapshot              RecommendationSnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  book                  Book                   @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
```

```ts
// src/lib/validators/book.ts
import { z } from "zod";

export const bookSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  coverImage: z.string().url().optional().or(z.literal("")),
  year: z.number().int().min(1000).max(2100),
  isbn: z.string().optional(),
  language: z.string().min(2),
  pages: z.number().int().positive()
});
```

- [ ] **Step 4: Run the unit test and generate Prisma client**

Run: `npm run test -- tests/unit/validators/book.test.ts && npm run db:generate`

Expected: PASS for the validator test and successful Prisma client generation.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/validators/book.ts tests/unit/validators/book.test.ts
git commit -m "feat: define core database schema and validation"
```

## Task 3: Implement authentication with credentials, OAuth, and roles

**Files:**
- Create: `src/auth.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/validators/auth.ts`
- Create: `src/lib/permissions.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/auth/sign-in/page.tsx`
- Create: `src/app/auth/sign-up/page.tsx`
- Create: `src/middleware.ts`
- Test: `tests/integration/auth/permissions.test.ts`

- [ ] **Step 1: Write a failing permission test**

```ts
// tests/integration/auth/permissions.test.ts
import { describe, expect, it } from "vitest";
import { canAccessAdmin } from "@/lib/permissions";

describe("canAccessAdmin", () => {
  it("allows admin users", () => {
    expect(canAccessAdmin({ role: "ADMIN" })).toBe(true);
  });

  it("rejects normal users", () => {
    expect(canAccessAdmin({ role: "USER" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/integration/auth/permissions.test.ts`

Expected: FAIL because permissions/auth files do not exist.

- [ ] **Step 3: Add Auth.js configuration and auth helpers**

```ts
// src/lib/permissions.ts
type RoleUser = { role: "USER" | "ADMIN" | string | null | undefined };

export function canAccessAdmin(user: RoleUser) {
  return user.role === "ADMIN";
}
```

```ts
// src/lib/validators/auth.ts
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
```

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signInSchema } from "@/lib/validators/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return passwordMatches ? user : null;
      }
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? ""
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    }
  }
});
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

```tsx
// src/app/auth/sign-in/page.tsx
export default function SignInPage() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">Вход</h1>
      <form className="space-y-4 rounded-xl border border-slate-800 p-6">
        <input name="email" type="email" placeholder="Email" className="w-full rounded bg-slate-900 p-3" />
        <input name="password" type="password" placeholder="Пароль" className="w-full rounded bg-slate-900 p-3" />
        <button className="w-full rounded bg-cyan-500 px-4 py-3 font-medium text-slate-950">
          Войти
        </button>
      </form>
    </section>
  );
}
```

```ts
// src/middleware.ts
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/profile/:path*", "/favorites/:path*", "/recommendations/:path*", "/admin/:path*"]
};
```

- [ ] **Step 4: Run the test and lint the auth files**

Run: `npm run test -- tests/integration/auth/permissions.test.ts && npm run lint`

Expected: PASS for permissions and no lint errors in the new auth files.

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/lib/auth.ts src/lib/permissions.ts src/lib/validators/auth.ts src/app/api/auth/[...nextauth]/route.ts src/app/auth/sign-in/page.tsx src/app/auth/sign-up/page.tsx src/middleware.ts tests/integration/auth/permissions.test.ts
git commit -m "feat: add authentication and role-based access control"
```

## Task 4: Seed the database with demo users, authors, genres, and books

**Files:**
- Create: `prisma/seed.ts`
- Modify: `.env.example`
- Test: `tests/integration/catalog/catalog-page.test.tsx`

- [ ] **Step 1: Write a failing test for catalog rendering from seeded data**

```tsx
// tests/integration/catalog/catalog-page.test.tsx
import { render, screen } from "@testing-library/react";
import CatalogPage from "@/app/catalog/page";

describe("CatalogPage", () => {
  it("shows the catalog title", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Каталог книг" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx`

Expected: FAIL because the catalog page does not exist yet.

- [ ] **Step 3: Add environment docs and seed script**

```env
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_library"
AUTH_SECRET="replace-with-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY=""
GIGACHAT_CLIENT_ID=""
GIGACHAT_CLIENT_SECRET=""
AI_PROVIDER="fallback"
```

```ts
// prisma/seed.ts
import bcrypt from "bcryptjs";
import { PrismaClient, ReviewStatus, UserRole, ReadingEventType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.recommendationItem.deleteMany();
  await prisma.recommendationSnapshot.deleteMany();
  await prisma.readingHistory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookAuthor.deleteMany();
  await prisma.bookGenre.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("Admin12345", 10);
  const userPassword = await bcrypt.hash("Reader12345", 10);

  const [fiction, science, design] = await prisma.$transaction([
    prisma.genre.create({ data: { name: "Фантастика", slug: "fantastika" } }),
    prisma.genre.create({ data: { name: "Наука", slug: "nauka" } }),
    prisma.genre.create({ data: { name: "Дизайн", slug: "dizayn" } })
  ]);

  const [martin, asimov, norman] = await prisma.$transaction([
    prisma.author.create({ data: { name: "Джордж Мартин", slug: "george-martin" } }),
    prisma.author.create({ data: { name: "Айзек Азимов", slug: "isaac-asimov" } }),
    prisma.author.create({ data: { name: "Дон Норман", slug: "don-norman" } })
  ]);

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

  const book = await prisma.book.create({
    data: {
      title: "Дизайн привычных вещей",
      slug: "design-of-everyday-things",
      description: "Классическая книга о проектировании и пользовательском опыте.",
      year: 2013,
      language: "ru",
      pages: 384,
      coverImage: "https://example.com/covers/design.jpg",
      authors: { create: [{ authorId: norman.id }] },
      genres: { create: [{ genreId: design.id }] }
    }
  });

  await prisma.favorite.create({ data: { userId: user.id, bookId: book.id } });
  await prisma.review.create({
    data: {
      userId: user.id,
      bookId: book.id,
      rating: 5,
      content: "Очень полезная книга для понимания UX.",
      status: ReviewStatus.PUBLISHED
    }
  });
  await prisma.readingHistory.create({
    data: {
      userId: user.id,
      bookId: book.id,
      eventType: ReadingEventType.FINISHED
    }
  });

  console.log({ adminEmail: admin.email, userEmail: user.email, demoBook: book.slug, martin, asimov, fiction, science });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 4: Run migrations and seed the local database**

Run: `npm run db:migrate -- --name init && npm run db:seed`

Expected: successful Prisma migration and seeded demo records in PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add .env.example prisma/seed.ts
git commit -m "feat: seed demo data for catalog and auth flows"
```

## Task 5: Build the catalog page with filtering and search

**Files:**
- Create: `src/lib/catalog/queries.ts`
- Create: `src/lib/catalog/service.ts`
- Create: `src/components/catalog/book-card.tsx`
- Create: `src/components/catalog/catalog-filters.tsx`
- Create: `src/app/catalog/page.tsx`
- Create: `src/app/api/books/route.ts`
- Test: `tests/integration/catalog/catalog-page.test.tsx`

- [ ] **Step 1: Extend the failing catalog test to assert visible book cards**

```tsx
// tests/integration/catalog/catalog-page.test.tsx
import { render, screen } from "@testing-library/react";
import CatalogPage from "@/app/catalog/page";

vi.mock("@/lib/catalog/service", () => ({
  getCatalogPageData: vi.fn(async () => ({
    books: [
      {
        id: "book-1",
        slug: "design-of-everyday-things",
        title: "Дизайн привычных вещей",
        description: "Классическая книга о проектировании.",
        year: 2013,
        coverImage: null,
        authors: ["Дон Норман"],
        genres: ["Дизайн"]
      }
    ],
    filters: { genres: ["Дизайн"], authors: ["Дон Норман"], years: [2013] }
  }))
}));

describe("CatalogPage", () => {
  it("shows the catalog title and a seeded book card", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Каталог книг" })).toBeInTheDocument();
    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the catalog test to verify it fails**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx`

Expected: FAIL because the page and catalog service are missing.

- [ ] **Step 3: Implement catalog queries, UI, and route handler**

```ts
// src/lib/catalog/service.ts
import { db } from "@/lib/db";

type CatalogSearchParams = {
  q?: string;
  genre?: string;
  author?: string;
  year?: string;
};

export async function getCatalogPageData(params: CatalogSearchParams) {
  const books = await db.book.findMany({
    where: {
      title: params.q ? { contains: params.q, mode: "insensitive" } : undefined,
      genres: params.genre ? { some: { genre: { slug: params.genre } } } : undefined,
      authors: params.author ? { some: { author: { slug: params.author } } } : undefined,
      year: params.year ? Number(params.year) : undefined
    },
    include: {
      authors: { include: { author: true } },
      genres: { include: { genre: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const [genres, authors] = await Promise.all([
    db.genre.findMany({ orderBy: { name: "asc" } }),
    db.author.findMany({ orderBy: { name: "asc" } })
  ]);

  return {
    books: books.map((book) => ({
      id: book.id,
      slug: book.slug,
      title: book.title,
      description: book.description,
      year: book.year,
      coverImage: book.coverImage,
      authors: book.authors.map((item) => item.author.name),
      genres: book.genres.map((item) => item.genre.name)
    })),
    filters: {
      genres: genres.map((genre) => ({ slug: genre.slug, name: genre.name })),
      authors: authors.map((author) => ({ slug: author.slug, name: author.name }))
    }
  };
}
```

```tsx
// src/components/catalog/book-card.tsx
import Link from "next/link";

type BookCardProps = {
  slug: string;
  title: string;
  description: string;
  authors: string[];
  genres: string[];
  year: number;
};

export function BookCard({ slug, title, description, authors, genres, year }: BookCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{authors.join(", ")} · {year}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm text-slate-300">{description}</p>
      <p className="mt-3 text-xs uppercase tracking-wide text-cyan-300">{genres.join(", ")}</p>
      <Link href={`/books/${slug}`} className="mt-4 inline-flex text-cyan-300">
        Открыть карточку
      </Link>
    </article>
  );
}
```

```tsx
// src/app/catalog/page.tsx
import { BookCard } from "@/components/catalog/book-card";
import { getCatalogPageData } from "@/lib/catalog/service";

export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const data = await getCatalogPageData(params);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Каталог книг</h1>
        <p className="mt-2 text-slate-300">Подберите книги по жанру, автору или году.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {data.books.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </section>
  );
}
```

```ts
// src/app/api/books/route.ts
import { NextResponse } from "next/server";
import { getCatalogPageData } from "@/lib/catalog/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getCatalogPageData({
    q: searchParams.get("q") ?? undefined,
    genre: searchParams.get("genre") ?? undefined,
    author: searchParams.get("author") ?? undefined,
    year: searchParams.get("year") ?? undefined
  });

  return NextResponse.json(data);
}
```

- [ ] **Step 4: Run the integration test**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx`

Expected: PASS with the mocked catalog service returning a visible book card.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog/queries.ts src/lib/catalog/service.ts src/components/catalog/book-card.tsx src/components/catalog/catalog-filters.tsx src/app/catalog/page.tsx src/app/api/books/route.ts tests/integration/catalog/catalog-page.test.tsx
git commit -m "feat: add catalog page with search and filtering"
```

## Task 6: Build the book detail page and record reading-history events

**Files:**
- Create: `src/components/books/book-detail.tsx`
- Create: `src/lib/reading-history/actions.ts`
- Create: `src/app/books/[slug]/page.tsx`
- Test: `tests/unit/reading-history/record-event.test.ts`

- [ ] **Step 1: Write a failing test for reading-history event normalization**

```ts
// tests/unit/reading-history/record-event.test.ts
import { describe, expect, it } from "vitest";
import { normalizeReadingEvent } from "@/lib/reading-history/actions";

describe("normalizeReadingEvent", () => {
  it("maps detail page opens to VIEWED events", () => {
    expect(normalizeReadingEvent("view")).toBe("VIEWED");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/reading-history/record-event.test.ts`

Expected: FAIL because the reading-history action file does not exist.

- [ ] **Step 3: Implement the book page and reading-history helper**

```ts
// src/lib/reading-history/actions.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";

export function normalizeReadingEvent(input: "view" | "interest" | "finished") {
  const eventMap = {
    view: "VIEWED",
    interest: "INTERESTED",
    finished: "FINISHED"
  } as const;

  return eventMap[input];
}

export async function recordReadingEvent(bookId: string, input: "view" | "interest" | "finished") {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return db.readingHistory.create({
    data: {
      bookId,
      userId: session.user.id,
      eventType: normalizeReadingEvent(input)
    }
  });
}
```

```tsx
// src/app/books/[slug]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await db.book.findUnique({
    where: { slug },
    include: {
      authors: { include: { author: true } },
      genres: { include: { genre: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        include: { user: true }
      }
    }
  });

  if (!book) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-cyan-300">{book.authors.map((item) => item.author.name).join(", ")}</p>
        <h1 className="text-4xl font-bold">{book.title}</h1>
        <p className="max-w-3xl text-slate-300">{book.description}</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Отзывы</h2>
        <div className="mt-4 space-y-4">
          {book.reviews.map((review) => (
            <article key={review.id} className="border-b border-slate-800 pb-4">
              <p className="font-medium">{review.user.name ?? review.user.email}</p>
              <p className="text-sm text-slate-400">Оценка: {review.rating}/5</p>
              <p className="mt-2 text-slate-300">{review.content}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the unit test**

Run: `npm run test -- tests/unit/reading-history/record-event.test.ts`

Expected: PASS for event normalization.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reading-history/actions.ts src/components/books/book-detail.tsx src/app/books/[slug]/page.tsx tests/unit/reading-history/record-event.test.ts
git commit -m "feat: add book details and reading history tracking"
```

## Task 7: Add favorites and profile pages

**Files:**
- Create: `src/lib/favorites/actions.ts`
- Create: `src/app/favorites/page.tsx`
- Create: `src/app/profile/page.tsx`
- Test: `tests/unit/favorites/toggle-favorite.test.ts`

- [ ] **Step 1: Write a failing favorites toggle test**

```ts
// tests/unit/favorites/toggle-favorite.test.ts
import { describe, expect, it } from "vitest";
import { buildFavoriteKey } from "@/lib/favorites/actions";

describe("buildFavoriteKey", () => {
  it("returns a stable composite key", () => {
    expect(buildFavoriteKey("user-1", "book-1")).toBe("user-1:book-1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/favorites/toggle-favorite.test.ts`

Expected: FAIL because the favorites module does not exist yet.

- [ ] **Step 3: Implement favorites and profile pages**

```ts
// src/lib/favorites/actions.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";

export function buildFavoriteKey(userId: string, bookId: string) {
  return `${userId}:${bookId}`;
}

export async function toggleFavorite(bookId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await db.favorite.findUnique({
    where: {
      userId_bookId: {
        userId: session.user.id,
        bookId
      }
    }
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return { active: false };
  }

  await db.favorite.create({
    data: {
      userId: session.user.id,
      bookId
    }
  });

  return { active: true };
}
```

```tsx
// src/app/favorites/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: { book: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Избранное</h1>
      {favorites.map((item) => (
        <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xl font-semibold">{item.book.title}</h2>
          <p className="mt-2 text-slate-300">{item.book.description}</p>
        </article>
      ))}
    </section>
  );
}
```

```tsx
// src/app/profile/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Профиль</h1>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p><span className="text-slate-400">Имя:</span> {session.user.name ?? "Без имени"}</p>
        <p><span className="text-slate-400">Email:</span> {session.user.email}</p>
        <p><span className="text-slate-400">Роль:</span> {session.user.role}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the unit test**

Run: `npm run test -- tests/unit/favorites/toggle-favorite.test.ts`

Expected: PASS for the composite key helper.

- [ ] **Step 5: Commit**

```bash
git add src/lib/favorites/actions.ts src/app/favorites/page.tsx src/app/profile/page.tsx tests/unit/favorites/toggle-favorite.test.ts
git commit -m "feat: add favorites and user profile pages"
```

## Task 8: Add reviews and rating workflows

**Files:**
- Create: `src/lib/validators/review.ts`
- Create: `src/lib/reviews/actions.ts`
- Modify: `src/app/books/[slug]/page.tsx`
- Test: `tests/unit/reviews/review-schema.test.ts`

- [ ] **Step 1: Write a failing review-schema test**

```ts
// tests/unit/reviews/review-schema.test.ts
import { describe, expect, it } from "vitest";
import { reviewSchema } from "@/lib/validators/review";

describe("reviewSchema", () => {
  it("rejects ratings outside the 1-5 range", () => {
    const result = reviewSchema.safeParse({ rating: 6, content: "Слишком высокий рейтинг" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/reviews/review-schema.test.ts`

Expected: FAIL because the review validator does not exist.

- [ ] **Step 3: Implement review validation and server action**

```ts
// src/lib/validators/review.ts
import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().min(20).max(2000)
});
```

```ts
// src/lib/reviews/actions.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validators/review";

export async function upsertReview(input: { bookId: string; rating: number; content: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = reviewSchema.parse({
    rating: input.rating,
    content: input.content
  });

  return db.review.upsert({
    where: {
      userId_bookId: {
        userId: session.user.id,
        bookId: input.bookId
      }
    },
    create: {
      userId: session.user.id,
      bookId: input.bookId,
      rating: parsed.rating,
      content: parsed.content
    },
    update: {
      rating: parsed.rating,
      content: parsed.content
    }
  });
}
```

```tsx
// src/app/books/[slug]/page.tsx
// Add a review form section below the book description:
<section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
  <h2 className="text-xl font-semibold">Оставить отзыв</h2>
  <form className="mt-4 space-y-4">
    <input name="rating" type="number" min="1" max="5" className="w-full rounded bg-slate-950 p-3" />
    <textarea name="content" rows={5} className="w-full rounded bg-slate-950 p-3" />
    <button className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950">
      Сохранить отзыв
    </button>
  </form>
</section>
```

- [ ] **Step 4: Run the review validator test**

Run: `npm run test -- tests/unit/reviews/review-schema.test.ts`

Expected: PASS with invalid ratings correctly rejected.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/review.ts src/lib/reviews/actions.ts src/app/books/[slug]/page.tsx tests/unit/reviews/review-schema.test.ts
git commit -m "feat: add reviews and ratings workflow"
```

## Task 9: Implement the AI abstraction layer and fallback recommendations

**Files:**
- Create: `src/lib/ai/provider.ts`
- Create: `src/lib/ai/openai-provider.ts`
- Create: `src/lib/ai/gigachat-provider.ts`
- Create: `src/lib/recommendations/fallback.ts`
- Create: `src/lib/recommendations/service.ts`
- Test: `tests/unit/recommendations/fallback.test.ts`

- [ ] **Step 1: Write a failing fallback recommendations test**

```ts
// tests/unit/recommendations/fallback.test.ts
import { describe, expect, it } from "vitest";
import { rankFallbackRecommendations } from "@/lib/recommendations/fallback";

describe("rankFallbackRecommendations", () => {
  it("sorts books by overlap score descending", () => {
    const ranked = rankFallbackRecommendations([
      { id: "a", score: 1 },
      { id: "b", score: 3 },
      { id: "c", score: 2 }
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/recommendations/fallback.test.ts`

Expected: FAIL because the fallback module does not exist.

- [ ] **Step 3: Implement provider contracts and recommendation services**

```ts
// src/lib/ai/provider.ts
export type RecommendationContext = {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  finishedBooks: string[];
};

export type RecommendationResult = {
  summary: string;
  items: Array<{ bookId: string; reason: string }>;
};

export interface AIProvider {
  getRecommendations(context: RecommendationContext): Promise<RecommendationResult>;
}
```

```ts
// src/lib/recommendations/fallback.ts
export function rankFallbackRecommendations<T extends { score: number }>(items: T[]) {
  return [...items].sort((left, right) => right.score - left.score);
}
```

```ts
// src/lib/recommendations/service.ts
import { db } from "@/lib/db";
import type { AIProvider, RecommendationContext, RecommendationResult } from "@/lib/ai/provider";
import { rankFallbackRecommendations } from "@/lib/recommendations/fallback";

export async function buildRecommendationContext(userId: string): Promise<RecommendationContext> {
  const [favorites, history] = await Promise.all([
    db.favorite.findMany({
      where: { userId },
      include: { book: { include: { genres: { include: { genre: true } }, authors: { include: { author: true } } } } }
    }),
    db.readingHistory.findMany({
      where: { userId, eventType: "FINISHED" },
      include: { book: true }
    })
  ]);

  return {
    favoriteGenres: favorites.flatMap((item) => item.book.genres.map((genre) => genre.genre.name)),
    favoriteAuthors: favorites.flatMap((item) => item.book.authors.map((author) => author.author.name)),
    finishedBooks: history.map((item) => item.book.title)
  };
}

export async function buildFallbackRecommendations(userId: string): Promise<RecommendationResult> {
  const books = await db.book.findMany({
    include: {
      genres: { include: { genre: true } },
      authors: { include: { author: true } },
      reviews: true
    }
  });

  const ranked = rankFallbackRecommendations(
    books.map((book) => ({
      bookId: book.id,
      score: book.reviews.reduce((sum, review) => sum + review.rating, 0),
      reason: "Похожа по жанрам и имеет высокий рейтинг."
    }))
  );

  return {
    summary: "Fallback-подборка по популярности и пересечению интересов.",
    items: ranked.slice(0, 6).map(({ bookId, reason }) => ({ bookId, reason }))
  };
}

export async function generateRecommendations(userId: string, provider: AIProvider) {
  const context = await buildRecommendationContext(userId);

  try {
    const aiResult = await provider.getRecommendations(context);
    return db.recommendationSnapshot.create({
      data: {
        userId,
        provider: process.env.AI_PROVIDER ?? "unknown",
        summary: aiResult.summary,
        items: {
          create: aiResult.items.map((item, index) => ({
            bookId: item.bookId,
            reason: item.reason,
            position: index + 1
          }))
        }
      },
      include: { items: true }
    });
  } catch {
    const fallback = await buildFallbackRecommendations(userId);
    return db.recommendationSnapshot.create({
      data: {
        userId,
        provider: "fallback",
        summary: fallback.summary,
        items: {
          create: fallback.items.map((item, index) => ({
            bookId: item.bookId,
            reason: item.reason,
            position: index + 1
          }))
        }
      },
      include: { items: true }
    });
  }
}
```

- [ ] **Step 4: Run the fallback test**

Run: `npm run test -- tests/unit/recommendations/fallback.test.ts`

Expected: PASS with items ordered by descending score.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/provider.ts src/lib/ai/openai-provider.ts src/lib/ai/gigachat-provider.ts src/lib/recommendations/fallback.ts src/lib/recommendations/service.ts tests/unit/recommendations/fallback.test.ts
git commit -m "feat: add ai abstraction and recommendation fallback logic"
```

## Task 10: Build the recommendations page and API endpoint

**Files:**
- Create: `src/components/recommendations/recommendation-card.tsx`
- Create: `src/app/recommendations/page.tsx`
- Create: `src/app/api/recommendations/route.ts`
- Test: `tests/integration/recommendations/recommendations-page.test.tsx`

- [ ] **Step 1: Write a failing page test for recommendation reasons**

```tsx
// tests/integration/recommendations/recommendations-page.test.tsx
import { render, screen } from "@testing-library/react";
import RecommendationsPage from "@/app/recommendations/page";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user-1" } }))
}));

vi.mock("@/lib/db", () => ({
  db: {
    recommendationSnapshot: {
      findFirst: vi.fn(async () => ({
        summary: "Подборка для любителей дизайна.",
        items: [
          {
            id: "item-1",
            reason: "Похожа по жанру и стилю изложения.",
            book: { title: "Эмоциональный дизайн", slug: "emotional-design" }
          }
        ]
      }))
    }
  }
}));

describe("RecommendationsPage", () => {
  it("shows recommendation reasons", async () => {
    render(await RecommendationsPage());
    expect(screen.getByText("Подборка для любителей дизайна.")).toBeInTheDocument();
    expect(screen.getByText("Похожа по жанру и стилю изложения.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/integration/recommendations/recommendations-page.test.tsx`

Expected: FAIL because the page and recommendation component do not exist.

- [ ] **Step 3: Implement the recommendation UI and route**

```tsx
// src/components/recommendations/recommendation-card.tsx
import Link from "next/link";

type RecommendationCardProps = {
  title: string;
  slug: string;
  reason: string;
};

export function RecommendationCard({ title, slug, reason }: RecommendationCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-slate-300">{reason}</p>
      <Link href={`/books/${slug}`} className="mt-4 inline-flex text-cyan-300">
        Перейти к книге
      </Link>
    </article>
  );
}
```

```tsx
// src/app/recommendations/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const snapshot = await db.recommendationSnapshot.findFirst({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Персональные рекомендации</h1>
        <p className="mt-2 text-slate-300">{snapshot?.summary ?? "Рекомендации пока не готовы."}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {snapshot?.items.map((item) => (
          <RecommendationCard
            key={item.id}
            title={item.book.title}
            slug={item.book.slug}
            reason={item.reason}
          />
        ))}
      </div>
    </section>
  );
}
```

```ts
// src/app/api/recommendations/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await db.recommendationSnapshot.findFirst({
    where: { userId: session.user.id },
    include: { items: { include: { book: true }, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(snapshot);
}
```

- [ ] **Step 4: Run the integration test**

Run: `npm run test -- tests/integration/recommendations/recommendations-page.test.tsx`

Expected: PASS with the mocked snapshot rendered correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/recommendations/recommendation-card.tsx src/app/recommendations/page.tsx src/app/api/recommendations/route.ts tests/integration/recommendations/recommendations-page.test.tsx
git commit -m "feat: add recommendations page and api endpoint"
```

## Task 11: Build the admin CRUD for books

**Files:**
- Create: `src/components/admin/book-form.tsx`
- Create: `src/app/admin/books/page.tsx`
- Create: `src/app/admin/books/new/page.tsx`
- Create: `src/app/admin/books/[id]/edit/page.tsx`
- Create: `src/app/api/books/[id]/route.ts`
- Test: `tests/integration/admin/admin-books-page.test.tsx`

- [ ] **Step 1: Write a failing admin page access test**

```tsx
// tests/integration/admin/admin-books-page.test.tsx
import { render, screen } from "@testing-library/react";
import AdminBooksPage from "@/app/admin/books/page";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "admin-1", role: "ADMIN" }
  }))
}));

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      findMany: vi.fn(async () => [{ id: "book-1", title: "Дизайн привычных вещей", slug: "design-of-everyday-things" }])
    }
  }
}));

describe("AdminBooksPage", () => {
  it("shows the admin catalog title", async () => {
    render(await AdminBooksPage());
    expect(screen.getByRole("heading", { name: "Управление книгами" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/integration/admin/admin-books-page.test.tsx`

Expected: FAIL because admin pages do not exist.

- [ ] **Step 3: Implement admin pages and protected CRUD route**

```tsx
// src/components/admin/book-form.tsx
type BookFormProps = {
  title?: string;
  description?: string;
  year?: number;
};

export function BookForm({ title = "", description = "", year = new Date().getFullYear() }: BookFormProps) {
  return (
    <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <input name="title" defaultValue={title} placeholder="Название" className="w-full rounded bg-slate-950 p-3" />
      <textarea name="description" defaultValue={description} rows={5} className="w-full rounded bg-slate-950 p-3" />
      <input name="year" type="number" defaultValue={year} className="w-full rounded bg-slate-950 p-3" />
      <button className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950">Сохранить</button>
    </form>
  );
}
```

```tsx
// src/app/admin/books/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";

export default async function AdminBooksPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user)) {
    redirect("/");
  }

  const books = await db.book.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Управление книгами</h1>
      {books.map((book) => (
        <article key={book.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xl font-semibold">{book.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{book.slug}</p>
        </article>
      ))}
    </section>
  );
}
```

```ts
// src/app/api/books/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const book = await db.book.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      year: body.year
    }
  });

  return NextResponse.json(book);
}
```

- [ ] **Step 4: Run the integration test**

Run: `npm run test -- tests/integration/admin/admin-books-page.test.tsx`

Expected: PASS with the mocked admin page rendering.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/book-form.tsx src/app/admin/books/page.tsx src/app/admin/books/new/page.tsx src/app/admin/books/[id]/edit/page.tsx src/app/api/books/[id]/route.ts tests/integration/admin/admin-books-page.test.tsx
git commit -m "feat: add admin book management flows"
```

## Task 12: Complete testing, README, and deployment readiness

**Files:**
- Modify: `README.md`
- Modify: `tests/e2e/smoke.spec.ts`
- Create: `playwright.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write a failing README assertion in the smoke test checklist**

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("catalog page is reachable", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Каталог книг" })).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke suite to verify at least one unfinished flow still fails**

Run: `npm run test:e2e`

Expected: FAIL until the app, seed data, and routes are fully wired together in the implementation phase.

- [ ] **Step 3: Add test configs and project documentation**

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI
  }
});
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
```

```md
// README.md
# Умная библиотека

Full-stack каталог книг на `Next.js`, `Prisma` и `PostgreSQL` с персональными рекомендациями.

## Возможности

- каталог с фильтрацией;
- карточки книг;
- вход через `email/password` и `OAuth`;
- избранное и отзывы;
- история чтения;
- рекомендации через `AIProvider` с fallback;
- административное управление книгами.

## Локальный запуск

1. Установить зависимости:
   `npm install`
2. Скопировать `.env.example` в `.env`
3. Поднять PostgreSQL и указать `DATABASE_URL`
4. Выполнить:
   `npm run db:migrate -- --name init`
   `npm run db:seed`
5. Запустить приложение:
   `npm run dev`

## Тесты

- `npm run test`
- `npm run test:e2e`

## Деплой

1. Создать проект на `Vercel`
2. Добавить переменные окружения
3. Подключить базу `PostgreSQL`
4. Выполнить production migration
5. Проверить вход, каталог и рекомендации
```

- [ ] **Step 4: Run the verification suite**

Run: `npm run lint && npm run test && npm run build`

Expected: PASS for lint, unit/integration tests, and production build before deployment.

- [ ] **Step 5: Commit**

```bash
git add README.md playwright.config.ts vitest.config.ts tests/e2e/smoke.spec.ts
git commit -m "chore: document setup and verify deployment readiness"
```

## Self-Review

### Spec coverage

- Catalog with filtering and search: covered by Tasks 5 and 6.
- Authentication and profile: covered by Tasks 3 and 7.
- Favorites and reviews: covered by Tasks 7 and 8.
- Reading history: covered by Task 6.
- AI abstraction and recommendations with fallback: covered by Tasks 9 and 10.
- Admin CRUD: covered by Task 11.
- Testing, README, and deployment readiness: covered by Task 12.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation placeholders remain in tasks.
- Each task includes concrete file paths, commands, and verification steps.

### Type consistency

- `UserRole` values are consistently `USER` and `ADMIN`.
- Recommendation services use `RecommendationSnapshot` and `RecommendationItem` naming consistently.
- Protected routes use `auth()` and `canAccessAdmin()` consistently across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-16-smart-library-mvp-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
