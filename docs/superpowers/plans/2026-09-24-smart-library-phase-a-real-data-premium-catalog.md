# Smart Library Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-oriented phase of `«Умная библиотека»` by adding real book-import infrastructure, controlled cover caching, richer catalog metadata, and a premium 3D catalog/detail UI.

**Architecture:** Extend the existing Next.js + Prisma monolith with a dedicated import pipeline (`normalize -> validate -> dedupe -> upsert -> cache covers`) and keep all runtime catalog reads on PostgreSQL rather than third-party APIs. Evolve the current catalog/detail experience into a bookshelf-style UI with lightweight 3D interactions and graceful fallbacks, while keeping admin operations and public catalog revalidation in the same domain flow.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, Zod, Tailwind CSS, Vitest, Playwright, Node `fetch`, `sharp`

---

## File Structure

### Existing files to modify

- `prisma/schema.prisma` - extend `Book` and add source/cover asset models.
- `prisma/seed.ts` - replace demo-only data flow with import-backed seed bootstrap.
- `package.json` - add import and asset pipeline scripts.
- `README.md` - document Phase A setup and import workflow.
- `src/lib/validators/book.ts` - validate richer book metadata.
- `src/lib/admin/book-input.ts` - parse new admin book fields.
- `src/lib/catalog/queries.ts` - expose richer catalog card/detail types.
- `src/lib/catalog/service.ts` - fetch featured books, cover asset data, and richer filters.
- `src/lib/catalog/public-cache.ts` - revalidate import-driven catalog/detail updates.
- `src/app/catalog/page.tsx` - render bookshelf hero, featured shelf, and premium results grid.
- `src/app/books/[slug]/page.tsx` - load cover asset + richer metadata into the detail page.
- `src/components/catalog/book-card.tsx` - 3D card presentation with controlled motion.
- `src/components/books/book-detail.tsx` - page-flip layout and richer metadata presentation.
- `src/components/admin/book-form.tsx` - expose subtitle/publisher/isbn13/featured/published controls.
- `src/app/admin/books/page.tsx` - show import state, cover state, and featured/published markers.
- `src/app/admin/books/new/page.tsx` - submit richer metadata.
- `src/app/admin/books/[id]/edit/page.tsx` - edit richer metadata.
- `src/app/api/books/route.ts` - support richer create payload.
- `src/app/api/books/[id]/route.ts` - support richer update payload.
- `src/app/globals.css` - add shared shelf, card, page-flip, and reduced-motion styles.

### New files to create

- `src/lib/import/types.ts` - normalized DTOs and import result types.
- `src/lib/import/sources/open-library.ts` - Open Library fetcher.
- `src/lib/import/sources/google-books.ts` - Google Books fetcher.
- `src/lib/import/normalize.ts` - provider-to-domain normalization.
- `src/lib/import/dedupe.ts` - `isbn13 -> isbn10 -> title+author+year` dedupe rules.
- `src/lib/import/upsert.ts` - transactional upsert for authors, genres, books, source records, and cover assets.
- `src/lib/import/report.ts` - import summary helpers.
- `src/lib/import/service.ts` - end-to-end import orchestration.
- `src/lib/books/cover-assets.ts` - download, cache, blur, dominant-color generation.
- `src/lib/books/presenters.ts` - map Prisma models into public UI view models.
- `src/lib/books/featured.ts` - featured shelf selection.
- `src/app/api/admin/import-books/route.ts` - admin-triggered import endpoint.
- `src/app/admin/import/page.tsx` - import control panel and latest run summary.
- `src/components/admin/import-books-form.tsx` - manual import trigger form.
- `src/components/catalog/featured-shelf.tsx` - hero shelf row.
- `src/components/catalog/catalog-hero.tsx` - search + value proposition + featured CTA block.
- `src/components/books/book-cover-stage.tsx` - detail cover stage with 3D visual shell.
- `scripts/import-books.mjs` - CLI entrypoint for real-data import.
- `tests/unit/import/normalize.test.ts`
- `tests/unit/import/dedupe.test.ts`
- `tests/unit/books/cover-assets.test.ts`
- `tests/integration/catalog/book-detail-page.test.tsx`
- `tests/integration/admin/admin-import-page.test.tsx`
- `tests/e2e/catalog-premium.spec.ts`

## Task 1: Extend the data model for real metadata and cover assets

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/validators/book.ts`
- Modify: `src/lib/admin/book-input.ts`
- Test: `tests/unit/validators/book.test.ts`

- [ ] **Step 1: Write the failing validator test for richer book metadata**

```ts
import { describe, expect, it } from "vitest";

import { bookSchema } from "@/lib/validators/book";

describe("bookSchema", () => {
  it("accepts extended metadata for imported books", () => {
    const result = bookSchema.parse({
      title: "The Left Hand of Darkness",
      slug: "left-hand-of-darkness",
      subtitle: "A Novel",
      originalTitle: "The Left Hand of Darkness",
      description: "Classic speculative fiction novel.",
      coverImage: "https://example.com/left-hand.jpg",
      year: 1969,
      isbn10: "0441478123",
      isbn13: "9780441478125",
      publisher: "Ace Books",
      edition: "50th Anniversary",
      language: "en",
      pages: 304,
      isFeatured: true,
      isPublished: true
    });

    expect(result.isbn13).toBe("9780441478125");
    expect(result.isFeatured).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/validators/book.test.ts`  
Expected: FAIL because `subtitle`, `isbn13`, `publisher`, `edition`, `isFeatured`, and `isPublished` are not yet part of the schema.

- [ ] **Step 3: Extend Prisma models and validator/parser**

```prisma
model Book {
  id               String            @id @default(cuid())
  title            String
  subtitle         String?
  originalTitle    String?
  slug             String            @unique
  description      String
  coverImage       String?
  year             Int
  isbn             String?           @unique
  isbn10           String?           @unique
  isbn13           String?           @unique
  publisher        String?
  edition          String?
  language         String
  pages            Int
  ratingAverage    Float?
  ratingsCount     Int?
  sourcePrimary    String?
  sourceExternalId String?
  isFeatured       Boolean           @default(false)
  isPublished      Boolean           @default(true)
  publishedAt      DateTime?
  coverAssets      BookCoverAsset[]
  sourceRecords    BookSourceRecord[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  authors          BookAuthor[]
  genres           BookGenre[]
  reviews          Review[]
  favorites        Favorite[]
  readingHistory   ReadingHistory[]
  recommendedIn    RecommendationItem[]
}

model BookSourceRecord {
  id             String   @id @default(cuid())
  bookId         String
  provider       String
  externalId     String
  sourceUrl      String?
  rawChecksum    String?
  rawPayload     Json?
  lastImportedAt DateTime @default(now())
  book           Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([provider, externalId])
}

model BookCoverAsset {
  id            String   @id @default(cuid())
  bookId        String
  originalUrl   String
  cachedPath    String
  publicUrl     String
  width         Int?
  height        Int?
  dominantColor String?
  blurDataUrl   String?
  status        String   @default("ready")
  lastFetchedAt DateTime @default(now())
  book          Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
}
```

```ts
export const bookSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  originalTitle: z.string().optional(),
  slug: z.string().min(2),
  description: z.string().min(10),
  coverImage: z.string().url().optional().or(z.literal("")),
  year: z.number().int().min(1000).max(2100),
  isbn: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  language: z.string().min(2),
  pages: z.number().int().positive(),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true)
});
```

- [ ] **Step 4: Run Prisma and validator tests**

Run: `npm run db:migrate -- --name phase-a-book-metadata && npm run db:generate && npm run test -- tests/unit/validators/book.test.ts`  
Expected: migration created successfully, Prisma client generated, validator test PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/validators/book.ts src/lib/admin/book-input.ts tests/unit/validators/book.test.ts
git commit -m "feat: extend book metadata for real catalog imports"
```

## Task 2: Build the normalization and dedupe import core

**Files:**
- Create: `src/lib/import/types.ts`
- Create: `src/lib/import/normalize.ts`
- Create: `src/lib/import/dedupe.ts`
- Create: `src/lib/import/sources/open-library.ts`
- Create: `src/lib/import/sources/google-books.ts`
- Test: `tests/unit/import/normalize.test.ts`
- Test: `tests/unit/import/dedupe.test.ts`

- [ ] **Step 1: Write the failing normalization and dedupe tests**

```ts
import { describe, expect, it } from "vitest";

import { dedupeImportedBooks } from "@/lib/import/dedupe";
import { normalizeGoogleBook, normalizeOpenLibraryBook } from "@/lib/import/normalize";

describe("normalize imported books", () => {
  it("maps Open Library and Google Books payloads into one DTO", () => {
    const openLibrary = normalizeOpenLibraryBook({
      key: "/works/OL82563W",
      title: "Dune",
      first_publish_year: 1965,
      author_name: ["Frank Herbert"],
      isbn: ["9780441172719"],
      cover_i: 8101356
    });

    const google = normalizeGoogleBook({
      id: "google-dune",
      volumeInfo: {
        title: "Dune",
        authors: ["Frank Herbert"],
        publishedDate: "1965-08-01",
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780441172719" }]
      }
    });

    expect(openLibrary.isbn13).toBe("9780441172719");
    expect(google.title).toBe("Dune");
  });

  it("dedupes by isbn13 before title and year", () => {
    const books = dedupeImportedBooks([
      { title: "Dune", authors: ["Frank Herbert"], year: 1965, isbn13: "9780441172719" },
      { title: "Dune", authors: ["Frank Herbert"], year: 1965, isbn13: "9780441172719" }
    ]);

    expect(books).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/import/normalize.test.ts tests/unit/import/dedupe.test.ts`  
Expected: FAIL because the import modules do not exist.

- [ ] **Step 3: Implement normalized DTOs and dedupe rules**

```ts
export type NormalizedImportedBook = {
  title: string;
  subtitle?: string;
  description: string;
  authors: string[];
  genres: string[];
  year: number;
  language: string;
  pages?: number;
  publisher?: string;
  isbn10?: string;
  isbn13?: string;
  coverUrl?: string;
  ratingAverage?: number;
  ratingsCount?: number;
  provider: "open-library" | "google-books";
  externalId: string;
  sourceUrl?: string;
};

export function dedupeImportedBooks(items: NormalizedImportedBook[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key =
      item.isbn13?.trim() ||
      item.isbn10?.trim() ||
      `${item.title.toLowerCase()}::${item.authors.join("|").toLowerCase()}::${item.year}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
```

- [ ] **Step 4: Re-run unit tests**

Run: `npm run test -- tests/unit/import/normalize.test.ts tests/unit/import/dedupe.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import tests/unit/import
git commit -m "feat: add normalized import and dedupe core"
```

## Task 3: Add controlled cover caching and asset metadata generation

**Files:**
- Create: `src/lib/books/cover-assets.ts`
- Test: `tests/unit/books/cover-assets.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing cover asset test**

```ts
import { describe, expect, it } from "vitest";

import { buildCoverStoragePath, normalizeDominantColor } from "@/lib/books/cover-assets";

describe("cover asset helpers", () => {
  it("creates deterministic storage paths and css-safe colors", () => {
    expect(buildCoverStoragePath("dune", "9780441172719")).toBe("public/covers/dune-9780441172719.jpg");
    expect(normalizeDominantColor("#abc")).toBe("#AABBCC");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/books/cover-assets.test.ts`  
Expected: FAIL because cover asset helpers do not exist.

- [ ] **Step 3: Implement asset download helpers and add `sharp`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const coversDir = path.join(process.cwd(), "public", "covers");

export function buildCoverStoragePath(slug: string, identifier: string) {
  return `public/covers/${slug}-${identifier}.jpg`;
}

export function normalizeDominantColor(color: string) {
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
  }

  return color.toUpperCase();
}

export async function cacheCoverAsset(input: { slug: string; identifier: string; url: string }) {
  await fs.mkdir(coversDir, { recursive: true });

  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error(`Cover download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const outputPath = path.join(process.cwd(), buildCoverStoragePath(input.slug, input.identifier));

  await image.resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(outputPath);

  return {
    cachedPath: outputPath,
    publicUrl: `/covers/${input.slug}-${input.identifier}.jpg`,
    width: metadata.width ?? null,
    height: metadata.height ?? null
  };
}
```

- [ ] **Step 4: Install dependency and rerun tests**

Run: `npm install sharp && npm run test -- tests/unit/books/cover-assets.test.ts`  
Expected: `sharp` added to `package.json` and the cover helper test PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/books/cover-assets.ts tests/unit/books/cover-assets.test.ts
git commit -m "feat: add controlled cover asset caching helpers"
```

## Task 4: Wire the import service, CLI script, and database upsert flow

**Files:**
- Create: `src/lib/import/upsert.ts`
- Create: `src/lib/import/report.ts`
- Create: `src/lib/import/service.ts`
- Create: `scripts/import-books.mjs`
- Modify: `package.json`
- Modify: `prisma/seed.ts`
- Test: `tests/integration/import/import-books-service.test.ts`

- [ ] **Step 1: Write the failing import orchestration test**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/import/sources/open-library", () => ({
  fetchOpenLibraryBooks: vi.fn(async () => [{ title: "Dune", authors: ["Frank Herbert"], year: 1965, description: "Epic science fiction.", genres: ["Science Fiction"], language: "en", provider: "open-library", externalId: "OL1" }])
}));

import { importBooksFromProviders } from "@/lib/import/service";

describe("importBooksFromProviders", () => {
  it("returns a summary with added and skipped counts", async () => {
    const report = await importBooksFromProviders({ queries: ["science fiction"] });
    expect(report.totalFetched).toBeGreaterThan(0);
    expect(report.added + report.updated + report.skipped).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/import/import-books-service.test.ts`
Expected: FAIL because `@/lib/import/service` does not exist yet.

- [ ] **Step 3: Implement the import orchestration and CLI**

```ts
export async function importBooksFromProviders(input: { queries: string[] }) {
  const openLibraryBooks = await fetchOpenLibraryBooks(input.queries);
  const googleBooks = await fetchGoogleBooks(input.queries);
  const normalized = dedupeImportedBooks([...openLibraryBooks, ...googleBooks]);

  const report = {
    totalFetched: normalized.length,
    added: 0,
    updated: 0,
    skipped: 0,
    coverFailures: 0
  };

  for (const book of normalized) {
    const result = await upsertImportedBook(book);
    report[result.kind] += 1;
    if (!result.coverReady) {
      report.coverFailures += 1;
    }
  }

  return report;
}
```

```js
import "dotenv/config";
import { importBooksFromProviders } from "../src/lib/import/service";

const queries = process.argv.slice(2);
const report = await importBooksFromProviders({
  queries: queries.length > 0 ? queries : ["design", "science fiction", "history", "business"]
});

console.log(JSON.stringify(report, null, 2));
```

- [ ] **Step 4: Add scripts and verify import command**

Run: `npm pkg set scripts.import:books="tsx scripts/import-books.mjs" scripts.db:seed="tsx prisma/seed.ts" && npm run import:books -- dune design`  
Expected: command completes, prints import summary, and upserts books into PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json prisma/seed.ts scripts/import-books.mjs src/lib/import
git commit -m "feat: add real book import pipeline and seed bootstrap"
```

## Task 5: Upgrade catalog queries and presenters for featured shelves and cached covers

**Files:**
- Create: `src/lib/books/presenters.ts`
- Create: `src/lib/books/featured.ts`
- Modify: `src/lib/catalog/queries.ts`
- Modify: `src/lib/catalog/service.ts`
- Test: `tests/integration/catalog/catalog-page.test.tsx`
- Test: `tests/integration/catalog/book-detail-page.test.tsx`

- [ ] **Step 1: Write failing integration expectations for featured books and cover assets**

```ts
expect(screen.getByRole("heading", { name: /Каталог книг/i })).toBeInTheDocument();
expect(screen.getByText(/Featured collection/i)).toBeInTheDocument();
expect(screen.getByAltText(/Дизайн привычных вещей/i)).toHaveAttribute("src", "/covers/design-of-everyday-things-9780441172719.jpg");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx tests/integration/catalog/book-detail-page.test.tsx`  
Expected: FAIL because catalog/detail view models do not expose featured or cached cover data.

- [ ] **Step 3: Add presenters and richer service queries**

```ts
export function toCatalogBookCard(book: CatalogBookRecord) {
  const primaryCover = book.coverAssets[0];

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    year: book.year,
    authors: book.authors.map((item) => item.author.name),
    genres: book.genres.map((item) => item.genre.name),
    coverImage: primaryCover?.publicUrl ?? book.coverImage,
    dominantColor: primaryCover?.dominantColor ?? "#0F172A",
    isFeatured: book.isFeatured
  };
}
```

```ts
const books = await db.book.findMany({
  where: { isPublished: true, ...filters },
  include: {
    authors: { include: { author: true } },
    genres: { include: { genre: true } },
    coverAssets: { orderBy: { lastFetchedAt: "desc" }, take: 1 }
  }
});
```

- [ ] **Step 4: Re-run integration tests**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx tests/integration/catalog/book-detail-page.test.tsx`  
Expected: PASS with featured shelf data and cached cover URLs available in the render tree.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books src/lib/catalog tests/integration/catalog
git commit -m "feat: expose featured catalog data and cached cover assets"
```

## Task 6: Rebuild the catalog page into a premium bookshelf layout

**Files:**
- Create: `src/components/catalog/catalog-hero.tsx`
- Create: `src/components/catalog/featured-shelf.tsx`
- Modify: `src/components/catalog/book-card.tsx`
- Modify: `src/app/catalog/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/integration/catalog/catalog-page.test.tsx`
- Test: `tests/e2e/catalog-premium.spec.ts`

- [ ] **Step 1: Write the failing catalog UI tests**

```ts
expect(screen.getByText(/Подберите следующую книгу/i)).toBeInTheDocument();
expect(screen.getByRole("link", { name: /Открыть карточку/i })).toBeInTheDocument();
expect(screen.getByText(/Featured collection/i)).toBeInTheDocument();
```

```ts
import { test, expect } from "@playwright/test";

test("catalog shows premium shelf layout", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Каталог книг" })).toBeVisible();
  await expect(page.locator("[data-testid='featured-shelf']")).toBeVisible();
  await expect(page.locator("[data-testid='book-card-3d']").first()).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx && npm run test:e2e -- tests/e2e/catalog-premium.spec.ts`  
Expected: FAIL because the new hero, featured shelf, and premium card hooks do not exist.

- [ ] **Step 3: Implement the bookshelf UI**

```tsx
export function BookCard({ slug, title, description, authors, genres, year, coverImage, dominantColor }: BookCardProps) {
  return (
    <article
      data-testid="book-card-3d"
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] transition-transform duration-300 motion-safe:hover:-translate-y-2 motion-safe:hover:rotate-[0.35deg]"
      style={{ backgroundImage: `radial-gradient(circle at top, ${dominantColor}33, transparent 55%)` }}
    >
      <div className="book-spine-effect" />
      <img src={coverImage ?? "/covers/fallback-book.jpg"} alt={title} className="h-72 w-full rounded-2xl object-cover" />
      <p className="mt-4 text-sm text-slate-400">{authors.join(", ")} · {year}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{description}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-300">{genres.join(", ")}</p>
      <Link href={`/books/${slug}`} className="mt-5 inline-flex text-sm font-medium text-cyan-300">Открыть карточку</Link>
    </article>
  );
}
```

- [ ] **Step 4: Re-run integration and e2e tests**

Run: `npm run test -- tests/integration/catalog/catalog-page.test.tsx && npm run test:e2e -- tests/e2e/catalog-premium.spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/catalog/page.tsx src/components/catalog src/app/globals.css tests/integration/catalog/catalog-page.test.tsx tests/e2e/catalog-premium.spec.ts
git commit -m "feat: add premium bookshelf catalog experience"
```

## Task 7: Rebuild the book detail page with page-flip presentation

**Files:**
- Create: `src/components/books/book-cover-stage.tsx`
- Modify: `src/components/books/book-detail.tsx`
- Modify: `src/app/books/[slug]/page.tsx`
- Test: `tests/integration/catalog/book-detail-page.test.tsx`

- [ ] **Step 1: Write the failing book detail integration test**

```ts
expect(screen.getByRole("heading", { name: "Дизайн привычных вещей" })).toBeInTheDocument();
expect(screen.getByText(/Издатель:/i)).toBeInTheDocument();
expect(screen.getByTestId("book-cover-stage")).toBeInTheDocument();
expect(screen.getByText(/Оставить отзыв/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/catalog/book-detail-page.test.tsx`  
Expected: FAIL because the page does not yet render the cover stage or richer metadata.

- [ ] **Step 3: Implement the detail-page layout**

```tsx
export function BookCoverStage({ title, coverImage, dominantColor }: { title: string; coverImage?: string | null; dominantColor?: string | null }) {
  return (
    <div
      data-testid="book-cover-stage"
      className="relative rounded-[32px] border border-white/10 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.45)]"
      style={{ background: `linear-gradient(160deg, ${dominantColor ?? "#1E293B"} 0%, rgba(15,23,42,0.92) 60%)` }}
    >
      <img src={coverImage ?? "/covers/fallback-book.jpg"} alt={title} className="mx-auto h-[420px] w-[280px] rounded-[24px] object-cover shadow-2xl" />
    </div>
  );
}
```

```tsx
<section className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
  <BookCoverStage title={title} coverImage={coverImage} dominantColor={dominantColor} />
  <div className="space-y-6 rounded-[28px] border border-white/10 bg-slate-950/80 p-8">
    <p className="text-sm uppercase tracking-[0.18em] text-cyan-300">{authors.join(", ")} · {year}</p>
    <h1 className="text-4xl font-bold">{title}</h1>
    <p className="text-slate-300">{description}</p>
    <dl className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
      <div><dt className="text-slate-500">Издатель:</dt><dd>{publisher ?? "Не указан"}</dd></div>
      <div><dt className="text-slate-500">ISBN-13:</dt><dd>{isbn13 ?? "Нет данных"}</dd></div>
    </dl>
  </div>
</section>
```

- [ ] **Step 4: Re-run integration tests**

Run: `npm run test -- tests/integration/catalog/book-detail-page.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/books/[slug]/page.tsx src/components/books tests/integration/catalog/book-detail-page.test.tsx
git commit -m "feat: add premium page-flip book detail layout"
```

## Task 8: Add admin import operations and richer book editing

**Files:**
- Create: `src/app/admin/import/page.tsx`
- Create: `src/components/admin/import-books-form.tsx`
- Create: `src/app/api/admin/import-books/route.ts`
- Modify: `src/components/admin/book-form.tsx`
- Modify: `src/app/admin/books/page.tsx`
- Modify: `src/app/admin/books/new/page.tsx`
- Modify: `src/app/admin/books/[id]/edit/page.tsx`
- Test: `tests/integration/admin/admin-import-page.test.tsx`
- Test: `tests/integration/admin/admin-books-page.test.tsx`

- [ ] **Step 1: Write failing admin integration tests**

```ts
expect(screen.getByRole("heading", { name: /Импорт каталога/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Запустить импорт/i })).toBeInTheDocument();
expect(screen.getByText(/Featured/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/admin/admin-import-page.test.tsx tests/integration/admin/admin-books-page.test.tsx`  
Expected: FAIL because the import admin page and richer state labels do not exist.

- [ ] **Step 3: Implement import admin controls and richer book form**

```tsx
export function ImportBooksForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <textarea
        name="queries"
        rows={4}
        defaultValue={"design\nscience fiction\nhistory\nbusiness"}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
      />
      <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">Запустить импорт</button>
    </form>
  );
}
```

```tsx
<label className="flex items-center gap-3 text-sm text-slate-200">
  <input type="checkbox" name="isFeatured" defaultChecked={initialValues?.isFeatured ?? false} />
  <span>Показывать в featured shelf</span>
</label>
<label className="flex items-center gap-3 text-sm text-slate-200">
  <input type="checkbox" name="isPublished" defaultChecked={initialValues?.isPublished ?? true} />
  <span>Публиковать в каталоге</span>
</label>
```

- [ ] **Step 4: Re-run admin integration tests**

Run: `npm run test -- tests/integration/admin/admin-import-page.test.tsx tests/integration/admin/admin-books-page.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/import src/app/api/admin/import-books src/components/admin src/app/admin/books tests/integration/admin
git commit -m "feat: add admin import controls and richer catalog operations"
```

## Task 9: Document and verify the full Phase A workflow

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Update README with the real-data workflow**

```md
## Phase A real catalog workflow

    npm run setup
    npm run import:books -- design "science fiction" history
    npm run dev

- imported books are normalized into PostgreSQL;
- covers are cached into `public/covers`;
- featured books appear in `/catalog`;
- admin can re-run imports from `/admin/import`.
```

- [ ] **Step 2: Run the verification commands**

Run: `npm run lint && npm run test && npm run build`  
Expected: all checks PASS.

- [ ] **Step 3: Run e2e smoke verification**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/catalog-premium.spec.ts`  
Expected: PASS for both existing smoke flow and new premium catalog flow.

- [ ] **Step 4: Commit**

```bash
git add README.md package.json tests/e2e
git commit -m "docs: document phase a real-data catalog workflow"
```

## Spec Coverage Check

- Real book data from public APIs: covered by Tasks 2, 3, and 4.
- Controlled cover caching: covered by Tasks 3, 5, and 9.
- Richer catalog metadata: covered by Tasks 1, 5, and 8.
- Premium 3D catalog UI: covered by Task 6.
- Premium page-flip detail UI: covered by Task 7.
- Admin import and refresh operations: covered by Task 8.
- Testing and reproducible workflow: covered by Tasks 1 through 9, especially Task 9.

## Self-Review

- Placeholder scan: no `TBD`, `TODO`, or deferred "implement later" markers remain.
- Type consistency: `isbn10`, `isbn13`, `isFeatured`, `isPublished`, `BookSourceRecord`, and `BookCoverAsset` are used consistently across schema, validators, admin input, and service tasks.
- Scope check: this plan intentionally covers only `Phase A: Foundation + Real Data + Premium Catalog UI`; AI, AR, voice, PWA, and deploy-hardening remain out of scope for this plan.
