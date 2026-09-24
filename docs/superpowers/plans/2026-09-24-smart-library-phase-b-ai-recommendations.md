# Smart Library Phase B AI Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-layer recommendation system that regenerates automatically from all user signals, creates fast fallback snapshots, and enriches those snapshots with AI without blocking the recommendations UI.

**Architecture:** Extend the current recommendation flow into a split pipeline: signal aggregation + deterministic fallback scoring first, then optional provider enrichment on top of the same snapshot lifecycle. Keep the orchestration centralized in the recommendations domain, and only trigger it from user-facing book actions after the underlying signal has been persisted.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, Zod, Auth.js, Vitest, Playwright

---

## File Structure

### Existing files to modify

- `prisma/schema.prisma` - extend recommendation snapshot metadata and item explanation fields.
- `package.json` - add Phase B verification commands if needed.
- `README.md` - document AI provider envs and recommendation refresh behavior.
- `src/lib/ai/provider.ts` - expand the AI provider contract to support richer context and enrichment output.
- `src/lib/ai/openai-provider.ts` - parse richer recommendation enrichment results.
- `src/lib/ai/gigachat-provider.ts` - match the richer provider contract even if still partially stubbed.
- `src/lib/recommendations/service.ts` - shrink into page-facing read helpers and provider selection wiring.
- `src/lib/recommendations/fallback.ts` - replace the current one-line sorter with real weighted fallback scoring.
- `src/lib/books/actions.ts` - trigger centralized recommendation refresh after favorite/review/reading events.
- `src/app/recommendations/page.tsx` - render the new hero, insight strip, and richer recommendation cards.
- `src/components/recommendations/recommendation-card.tsx` - show cover, author, reason, and signal badge.
- `tests/unit/recommendations/fallback.test.ts` - replace the existing shallow fallback test with weighted scoring coverage.
- `tests/integration/recommendations/recommendations-page.test.tsx` - verify the richer read model and UI.

### New files to create

- `prisma/migrations/<timestamp>_phase_b_recommendation_snapshots/migration.sql` - add snapshot lifecycle columns.
- `src/lib/recommendations/types.ts` - shared domain types for signals, fallback items, insights, and snapshot payloads.
- `src/lib/recommendations/response-schema.ts` - Zod schema for AI enrichment payloads.
- `src/lib/recommendations/signals.ts` - aggregate all recommendation signals from favorites, reading history, reviews, and ratings.
- `src/lib/recommendations/candidates.ts` - load recommendation candidates with the relations needed for scoring and UI rendering.
- `src/lib/recommendations/reasons.ts` - deterministic item reason and page summary builders.
- `src/lib/recommendations/snapshot.ts` - snapshot create/update/read helpers and metadata handling.
- `src/lib/recommendations/refresh.ts` - orchestration entry-point for fallback snapshot creation plus non-blocking AI enrichment.
- `src/lib/recommendations/insights.ts` - derive insight strip data from the aggregated context.
- `src/components/recommendations/recommendation-hero.tsx` - summary/freshness/status header block.
- `src/components/recommendations/recommendation-insight-strip.tsx` - favorite genres/authors/finished books insight bar.
- `tests/unit/recommendations/signals.test.ts`
- `tests/unit/recommendations/reasons.test.ts`
- `tests/unit/recommendations/response-schema.test.ts`
- `tests/unit/recommendations/provider-selection.test.ts`
- `tests/integration/recommendations/recommendation-refresh.test.ts`
- `tests/e2e/recommendations-phase-b.spec.ts`

## Task 1: Expand recommendation domain types and snapshot schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/recommendations/types.ts`
- Create: `src/lib/recommendations/response-schema.ts`
- Modify: `src/lib/ai/provider.ts`
- Test: `tests/unit/recommendations/response-schema.test.ts`

- [ ] **Step 1: Write the failing response-schema test**

```ts
import { describe, expect, it } from "vitest";

import { recommendationEnrichmentSchema } from "@/lib/recommendations/response-schema";

describe("recommendationEnrichmentSchema", () => {
  it("accepts enriched summary, insights, and per-item explanations", () => {
    const parsed = recommendationEnrichmentSchema.parse({
      summary: "Подборка собрана из любимых жанров, завершённых книг и высоких оценок.",
      insights: {
        favoriteGenres: ["Дизайн", "Научная фантастика"],
        favoriteAuthors: ["Don Norman"],
        finishedBooks: ["Основание"],
        highRatedThemes: ["UX", "системное мышление"]
      },
      items: [
        {
          bookId: "book-1",
          reason: "Похожа на книги, которые вы завершили и оценили высоко.",
          badge: "finished-match"
        }
      ]
    });

    expect(parsed.items[0].badge).toBe("finished-match");
    expect(parsed.insights.favoriteGenres).toContain("Дизайн");
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm run test -- tests/unit/recommendations/response-schema.test.ts`  
Expected: FAIL because `response-schema.ts` does not exist yet.

- [ ] **Step 3: Extend Prisma snapshot models and create the shared recommendation types**

```prisma
model RecommendationSnapshot {
  id            String               @id @default(cuid())
  summary       String
  createdAt     DateTime             @default(now())
  provider      String
  strategy      String               @default("fallback")
  status        String               @default("ready")
  triggerSource String?
  contextHash   String?
  insights      Json?
  userId        String
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  items         RecommendationItem[]
}

model RecommendationItem {
  id         String                 @id @default(cuid())
  reason     String
  badge      String?
  score      Float?
  position   Int
  snapshotId String
  bookId     String
  snapshot   RecommendationSnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  book       Book                   @relation(fields: [bookId], references: [id], onDelete: Cascade)
}
```

```ts
export type RecommendationInsights = {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  finishedBooks: string[];
  highRatedThemes: string[];
};

export type RecommendationContext = {
  userId: string;
  favoriteBooks: Array<{ bookId: string; title: string }>;
  favoriteGenres: string[];
  favoriteAuthors: string[];
  readingSignals: Array<{
    bookId: string;
    title: string;
    eventType: "VIEWED" | "INTERESTED" | "FINISHED";
    genres: string[];
    authors: string[];
  }>;
  reviewedBooks: Array<{
    bookId: string;
    title: string;
    rating: number;
    content: string;
    genres: string[];
    authors: string[];
  }>;
  excludedBookIds: string[];
};

export type RecommendationResultItem = {
  bookId: string;
  reason: string;
  badge?: string;
  score?: number;
};

export type RecommendationResult = {
  summary: string;
  insights: RecommendationInsights;
  items: RecommendationResultItem[];
};
```

```ts
import { z } from "zod";

export const recommendationEnrichmentSchema = z.object({
  summary: z.string().min(10),
  insights: z.object({
    favoriteGenres: z.array(z.string()),
    favoriteAuthors: z.array(z.string()),
    finishedBooks: z.array(z.string()),
    highRatedThemes: z.array(z.string())
  }),
  items: z.array(
    z.object({
      bookId: z.string().min(1),
      reason: z.string().min(10),
      badge: z.string().optional()
    })
  )
});
```

- [ ] **Step 4: Update the AI provider contract to return the richer result**

```ts
import type { RecommendationContext, RecommendationResult } from "@/lib/recommendations/types";

export interface AIProvider {
  getRecommendations(context: RecommendationContext): Promise<RecommendationResult>;
}
```

- [ ] **Step 5: Run migration generation and targeted tests**

Run: `npm run db:migrate -- --name phase-b-recommendation-snapshots && npm run test -- tests/unit/recommendations/response-schema.test.ts`  
Expected: migration created and the response-schema test PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/ai/provider.ts src/lib/recommendations/types.ts src/lib/recommendations/response-schema.ts tests/unit/recommendations/response-schema.test.ts
git commit -m "feat: extend recommendation snapshot domain types"
```

## Task 2: Aggregate all recommendation signals into one context

**Files:**
- Create: `src/lib/recommendations/signals.ts`
- Test: `tests/unit/recommendations/signals.test.ts`
- Modify: `src/lib/recommendations/service.ts`

- [ ] **Step 1: Write the failing signal-aggregation test**

```ts
import { describe, expect, it, vi } from "vitest";

const { favoriteFindMany, historyFindMany, reviewFindMany } = vi.hoisted(() => ({
  favoriteFindMany: vi.fn(),
  historyFindMany: vi.fn(),
  reviewFindMany: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    favorite: { findMany: favoriteFindMany },
    readingHistory: { findMany: historyFindMany },
    review: { findMany: reviewFindMany }
  }
}));

import { buildRecommendationContext } from "@/lib/recommendations/signals";

describe("buildRecommendationContext", () => {
  it("collects favorites, reading history, reviews, and exclusions into one context", async () => {
    favoriteFindMany.mockResolvedValue([
      {
        bookId: "book-fav",
        book: {
          title: "Дизайн привычных вещей",
          genres: [{ genre: { name: "Дизайн" } }],
          authors: [{ author: { name: "Don Norman" } }]
        }
      }
    ]);
    historyFindMany.mockResolvedValue([
      {
        bookId: "book-finished",
        eventType: "FINISHED",
        book: {
          title: "Основание",
          genres: [{ genre: { name: "Научная фантастика" } }],
          authors: [{ author: { name: "Isaac Asimov" } }]
        }
      }
    ]);
    reviewFindMany.mockResolvedValue([
      {
        bookId: "book-reviewed",
        rating: 5,
        content: "Очень сильная книга про UX.",
        book: {
          title: "Эмоциональный дизайн",
          genres: [{ genre: { name: "UX" } }],
          authors: [{ author: { name: "Don Norman" } }]
        }
      }
    ]);

    const context = await buildRecommendationContext("user-1");

    expect(context.favoriteAuthors).toEqual(["Don Norman"]);
    expect(context.favoriteGenres).toEqual(["Дизайн"]);
    expect(context.readingSignals[0].eventType).toBe("FINISHED");
    expect(context.reviewedBooks[0].rating).toBe(5);
    expect(context.excludedBookIds).toContain("book-finished");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/recommendations/signals.test.ts`  
Expected: FAIL because `signals.ts` does not exist yet.

- [ ] **Step 3: Implement centralized signal aggregation**

```ts
import { db } from "@/lib/db";

import type { RecommendationContext } from "@/lib/recommendations/types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function buildRecommendationContext(userId: string): Promise<RecommendationContext> {
  const [favorites, history, reviews] = await Promise.all([
    db.favorite.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            genres: { include: { genre: true } },
            authors: { include: { author: true } }
          }
        }
      }
    }),
    db.readingHistory.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: "desc" }
    }),
    db.review.findMany({
      where: { userId, status: "PUBLISHED" },
      include: {
        book: {
          include: {
            genres: { include: { genre: true } },
            authors: { include: { author: true } }
          }
        }
      }
    })
  ]);

  const favoriteGenres = unique(
    favorites.flatMap((item) => item.book.genres.map((entry) => entry.genre.name))
  );
  const favoriteAuthors = unique(
    favorites.flatMap((item) => item.book.authors.map((entry) => entry.author.name))
  );

  return {
    userId,
    favoriteBooks: favorites.map((item) => ({
      bookId: item.bookId,
      title: item.book.title
    })),
    favoriteGenres,
    favoriteAuthors,
    readingSignals: history.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      eventType: item.eventType,
      genres: item.book.genres.map((entry) => entry.genre.name),
      authors: item.book.authors.map((entry) => entry.author.name)
    })),
    reviewedBooks: reviews.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      rating: item.rating,
      content: item.content,
      genres: item.book.genres.map((entry) => entry.genre.name),
      authors: item.book.authors.map((entry) => entry.author.name)
    })),
    excludedBookIds: unique(
      [
        ...favorites.map((item) => item.bookId),
        ...history.filter((item) => item.eventType === "FINISHED").map((item) => item.bookId)
      ].map(String)
    )
  };
}
```

- [ ] **Step 4: Re-export the new context builder from the recommendation service**

```ts
export { buildRecommendationContext } from "@/lib/recommendations/signals";
```

- [ ] **Step 5: Run the targeted signal test**

Run: `npm run test -- tests/unit/recommendations/signals.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recommendations/signals.ts src/lib/recommendations/service.ts tests/unit/recommendations/signals.test.ts
git commit -m "feat: aggregate all recommendation signals into one context"
```

## Task 3: Build the fallback scoring, reason, and insight engine

**Files:**
- Create: `src/lib/recommendations/candidates.ts`
- Modify: `src/lib/recommendations/fallback.ts`
- Create: `src/lib/recommendations/reasons.ts`
- Create: `src/lib/recommendations/insights.ts`
- Test: `tests/unit/recommendations/fallback.test.ts`
- Test: `tests/unit/recommendations/reasons.test.ts`

- [ ] **Step 1: Replace the existing fallback test with weighted scoring coverage**

```ts
import { describe, expect, it } from "vitest";

import { buildFallbackRecommendationResult } from "@/lib/recommendations/fallback";
import type { RecommendationContext } from "@/lib/recommendations/types";

const context: RecommendationContext = {
  userId: "user-1",
  favoriteBooks: [{ bookId: "fav-1", title: "Дизайн привычных вещей" }],
  favoriteGenres: ["Дизайн"],
  favoriteAuthors: ["Don Norman"],
  readingSignals: [
    {
      bookId: "finished-1",
      title: "Основание",
      eventType: "FINISHED",
      genres: ["Научная фантастика"],
      authors: ["Isaac Asimov"]
    }
  ],
  reviewedBooks: [
    {
      bookId: "review-1",
      title: "Эмоциональный дизайн",
      rating: 5,
      content: "Очень сильная книга про UX.",
      genres: ["Дизайн", "UX"],
      authors: ["Don Norman"]
    }
  ],
  excludedBookIds: ["fav-1", "finished-1"]
};

describe("buildFallbackRecommendationResult", () => {
  it("ranks author and genre matches above generic popularity", () => {
    const result = buildFallbackRecommendationResult(context, [
      {
        id: "candidate-1",
        title: "Новый взгляд на UX",
        authors: ["Don Norman"],
        genres: ["Дизайн"],
        ratingAverage: 4.6,
        ratingsCount: 1200
      },
      {
        id: "candidate-2",
        title: "Популярная книга",
        authors: ["Другой автор"],
        genres: ["Бизнес"],
        ratingAverage: 4.9,
        ratingsCount: 12000
      }
    ]);

    expect(result.items[0].bookId).toBe("candidate-1");
    expect(result.items[0].badge).toBe("author-match");
    expect(result.summary).toContain("любимых авторов");
  });
});
```

- [ ] **Step 2: Run the fallback and reasons tests to verify they fail**

Run: `npm run test -- tests/unit/recommendations/fallback.test.ts tests/unit/recommendations/reasons.test.ts`  
Expected: FAIL because the new helpers do not exist and the current fallback function has no weighted behavior.

- [ ] **Step 3: Implement a reusable candidate loader**

```ts
import { db } from "@/lib/db";

export async function getRecommendationCandidates() {
  const books = await db.book.findMany({
    where: { isPublished: true },
    include: {
      authors: { include: { author: true } },
      genres: { include: { genre: true } },
      coverAssets: {
        orderBy: { lastFetchedAt: "desc" },
        take: 1
      }
    }
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    slug: book.slug,
    coverImage: book.coverAssets[0]?.publicUrl ?? book.coverImage,
    authors: book.authors.map((entry) => entry.author.name),
    genres: book.genres.map((entry) => entry.genre.name),
    ratingAverage: book.ratingAverage,
    ratingsCount: book.ratingsCount
  }));
}
```

- [ ] **Step 4: Implement weighted fallback scoring**

```ts
import type { RecommendationContext, RecommendationResult } from "@/lib/recommendations/types";

type CandidateBook = {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
  ratingAverage: number | null;
  ratingsCount: number | null;
};

function scoreCandidate(context: RecommendationContext, candidate: CandidateBook) {
  const authorMatches = candidate.authors.filter((name) => context.favoriteAuthors.includes(name)).length;
  const genreMatches = candidate.genres.filter((name) => context.favoriteGenres.includes(name)).length;
  const finishedGenreMatches = context.readingSignals
    .filter((signal) => signal.eventType === "FINISHED")
    .flatMap((signal) => signal.genres)
    .filter((genre) => candidate.genres.includes(genre)).length;
  const finishedAuthorMatches = context.readingSignals
    .filter((signal) => signal.eventType === "FINISHED")
    .flatMap((signal) => signal.authors)
    .filter((author) => candidate.authors.includes(author)).length;
  const highRatedGenreMatches = context.reviewedBooks
    .filter((review) => review.rating >= 4)
    .flatMap((review) => review.genres)
    .filter((genre) => candidate.genres.includes(genre)).length;
  const popularity = Math.min((candidate.ratingAverage ?? 0) + (candidate.ratingsCount ?? 0) / 5000, 3);

  return (
    authorMatches * 8 +
    genreMatches * 5 +
    finishedAuthorMatches * 6 +
    finishedGenreMatches * 4 +
    highRatedGenreMatches * 3 +
    popularity
  );
}

export function buildFallbackRecommendationResult(
  context: RecommendationContext,
  candidates: CandidateBook[]
): RecommendationResult {
  const ranked = candidates
    .filter((candidate) => !context.excludedBookIds.includes(candidate.id))
    .map((candidate) => ({
      bookId: candidate.id,
      score: scoreCandidate(context, candidate),
      ...buildFallbackReason(context, candidate)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  return {
    summary: buildFallbackSummary(context),
    insights: buildRecommendationInsights(context),
    items: ranked.map(({ bookId, reason, badge, score }) => ({ bookId, reason, badge, score }))
  };
}
```

- [ ] **Step 5: Implement deterministic reason and insight builders**

```ts
import type { RecommendationContext } from "@/lib/recommendations/types";

export function buildFallbackReason(
  context: RecommendationContext,
  candidate: { authors: string[]; genres: string[] }
) {
  const finishedAuthors = context.readingSignals
    .filter((signal) => signal.eventType === "FINISHED")
    .flatMap((signal) => signal.authors);
  const finishedGenres = context.readingSignals
    .filter((signal) => signal.eventType === "FINISHED")
    .flatMap((signal) => signal.genres);

  if (candidate.authors.some((name) => context.favoriteAuthors.includes(name))) {
    return {
      reason: "Рекомендуем книгу из-за совпадения с вашими любимыми авторами.",
      badge: "author-match"
    };
  }

  if (candidate.authors.some((name) => finishedAuthors.includes(name))) {
    return {
      reason: "Рекомендуем книгу на основе авторов, которых вы уже дочитывали до конца.",
      badge: "finished-author-match"
    };
  }

  if (candidate.genres.some((name) => context.favoriteGenres.includes(name))) {
    return {
      reason: "Рекомендуем книгу на основе жанров, которые вы чаще всего выбираете.",
      badge: "genre-match"
    };
  }

  if (candidate.genres.some((name) => finishedGenres.includes(name))) {
    return {
      reason: "Рекомендуем книгу на основе жанров из завершённых вами книг.",
      badge: "finished-genre-match"
    };
  }

  if (context.reviewedBooks.some((review) => review.rating >= 4)) {
    return {
      reason: "Рекомендуем книгу на основе тем, которые вы оценивали особенно высоко.",
      badge: "high-rated-theme"
    };
  }

  return {
    reason: "Рекомендуем книгу как сильный следующий шаг по вашему читательскому профилю.",
    badge: "profile-match"
  };
}

export function buildFallbackSummary(context: RecommendationContext) {
  if (context.favoriteAuthors.length > 0 && context.favoriteGenres.length > 0) {
    return "Подборка собрана из любимых авторов, жанров и книг, которые вы уже завершили.";
  }

  if (context.favoriteGenres.length > 0) {
    return "Подборка собрана из любимых жанров и истории чтения.";
  }

  return "Подборка собрана из истории чтения, оценок и сигналов профиля.";
}
```

```ts
import type { RecommendationContext, RecommendationInsights } from "@/lib/recommendations/types";

export function buildRecommendationInsights(context: RecommendationContext): RecommendationInsights {
  return {
    favoriteGenres: context.favoriteGenres.slice(0, 4),
    favoriteAuthors: context.favoriteAuthors.slice(0, 4),
    finishedBooks: context.readingSignals
      .filter((signal) => signal.eventType === "FINISHED")
      .map((signal) => signal.title)
      .slice(0, 4),
    highRatedThemes: context.reviewedBooks
      .filter((review) => review.rating >= 4)
      .map((review) => review.title)
      .slice(0, 4)
  };
}
```

- [ ] **Step 6: Run the weighted fallback tests**

Run: `npm run test -- tests/unit/recommendations/fallback.test.ts tests/unit/recommendations/reasons.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recommendations/candidates.ts src/lib/recommendations/fallback.ts src/lib/recommendations/reasons.ts src/lib/recommendations/insights.ts tests/unit/recommendations/fallback.test.ts tests/unit/recommendations/reasons.test.ts
git commit -m "feat: add weighted fallback recommendation engine"
```

## Task 4: Add snapshot lifecycle helpers and centralized refresh orchestration

**Files:**
- Create: `src/lib/recommendations/snapshot.ts`
- Create: `src/lib/recommendations/refresh.ts`
- Modify: `src/lib/recommendations/service.ts`
- Test: `tests/integration/recommendations/recommendation-refresh.test.ts`

- [ ] **Step 1: Write the failing refresh orchestration test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { buildRecommendationContext, getRecommendationCandidates, buildFallbackRecommendationResult, createRecommendationSnapshot } = vi.hoisted(() => ({
  buildRecommendationContext: vi.fn(),
  getRecommendationCandidates: vi.fn(),
  buildFallbackRecommendationResult: vi.fn(),
  createRecommendationSnapshot: vi.fn()
}));

vi.mock("@/lib/recommendations/signals", () => ({ buildRecommendationContext }));
vi.mock("@/lib/recommendations/candidates", () => ({ getRecommendationCandidates }));
vi.mock("@/lib/recommendations/fallback", () => ({ buildFallbackRecommendationResult }));
vi.mock("@/lib/recommendations/snapshot", () => ({ createRecommendationSnapshot }));

import { refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";

describe("refreshRecommendationSnapshotForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a fallback snapshot first and returns it before enrichment", async () => {
    buildRecommendationContext.mockResolvedValue({ userId: "user-1" });
    getRecommendationCandidates.mockResolvedValue([]);
    buildFallbackRecommendationResult.mockReturnValue({
      summary: "Fallback summary",
      insights: { favoriteGenres: [], favoriteAuthors: [], finishedBooks: [], highRatedThemes: [] },
      items: [{ bookId: "book-1", reason: "Fallback reason", badge: "genre-match", score: 9 }]
    });
    createRecommendationSnapshot.mockResolvedValue({ id: "snapshot-1", status: "ready", strategy: "fallback" });

    const snapshot = await refreshRecommendationSnapshotForUser("user-1", "favorite");

    expect(createRecommendationSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        triggerSource: "favorite",
        strategy: "fallback"
      })
    );
    expect(snapshot.strategy).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run the orchestration test to verify it fails**

Run: `npm run test -- tests/integration/recommendations/recommendation-refresh.test.ts`  
Expected: FAIL because `refresh.ts` and `snapshot.ts` do not exist yet.

- [ ] **Step 3: Implement snapshot helpers**

```ts
import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import type { RecommendationResult } from "@/lib/recommendations/types";

export function createRecommendationContextHash(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function createRecommendationSnapshot(input: {
  userId: string;
  provider: string;
  strategy: "fallback" | "ai-enriched";
  status: "ready" | "enriching" | "failed";
  triggerSource: string;
  contextHash: string;
  result: RecommendationResult;
}) {
  return db.recommendationSnapshot.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      strategy: input.strategy,
      status: input.status,
      triggerSource: input.triggerSource,
      contextHash: input.contextHash,
      summary: input.result.summary,
      insights: input.result.insights,
      items: {
        create: input.result.items.map((item, index) => ({
          bookId: item.bookId,
          reason: item.reason,
          badge: item.badge,
          score: item.score,
          position: index + 1
        }))
      }
    },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    }
  });
}

export async function updateRecommendationSnapshot(
  snapshotId: string,
  input: {
    provider: string;
    strategy?: "fallback" | "ai-enriched";
    status: "ready" | "enriching" | "failed";
    result?: RecommendationResult;
  }
) {
  return db.recommendationSnapshot.update({
    where: { id: snapshotId },
    data: {
      provider: input.provider,
      strategy: input.strategy,
      status: input.status,
      summary: input.result?.summary,
      insights: input.result?.insights,
      items: input.result
        ? {
            deleteMany: {},
            create: input.result.items.map((item, index) => ({
              bookId: item.bookId,
              reason: item.reason,
              badge: item.badge,
              score: item.score,
              position: index + 1
            }))
          }
        : undefined
    },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    }
  });
}
```

- [ ] **Step 4: Implement the centralized refresh orchestration**

```ts
import { revalidatePath } from "next/cache";

import { getRecommendationCandidates } from "@/lib/recommendations/candidates";
import { buildRecommendationContext } from "@/lib/recommendations/signals";
import { buildFallbackRecommendationResult } from "@/lib/recommendations/fallback";
import { createRecommendationContextHash, createRecommendationSnapshot } from "@/lib/recommendations/snapshot";

export async function refreshRecommendationSnapshotForUser(
  userId: string,
  triggerSource: "favorite" | "review" | "interest" | "finished" | "manual"
) {
  const context = await buildRecommendationContext(userId);
  const candidates = await getRecommendationCandidates();
  const contextHash = createRecommendationContextHash(context);
  const fallback = buildFallbackRecommendationResult(context, candidates);

  const snapshot = await createRecommendationSnapshot({
    userId,
    provider: "fallback",
    strategy: "fallback",
    status: "ready",
    triggerSource,
    contextHash,
    result: fallback
  });

  revalidatePath("/recommendations");
  return snapshot;
}
```

- [ ] **Step 5: Add the page read-model helper for the latest usable snapshot**

```ts
import { db } from "@/lib/db";

export async function getLatestRecommendationSnapshot(userId: string) {
  return db.recommendationSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          book: {
            include: {
              authors: { include: { author: true } },
              coverAssets: {
                orderBy: { lastFetchedAt: "desc" },
                take: 1
              }
            }
          }
        }
      }
    }
  });
}
```

- [ ] **Step 6: Re-run the orchestration integration test**

Run: `npm run test -- tests/integration/recommendations/recommendation-refresh.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recommendations/snapshot.ts src/lib/recommendations/refresh.ts src/lib/recommendations/service.ts tests/integration/recommendations/recommendation-refresh.test.ts
git commit -m "feat: add recommendation snapshot lifecycle orchestration"
```

## Task 5: Upgrade provider enrichment and provider selection

**Files:**
- Modify: `src/lib/recommendations/refresh.ts`
- Modify: `src/lib/recommendations/service.ts`
- Modify: `src/lib/ai/openai-provider.ts`
- Modify: `src/lib/ai/gigachat-provider.ts`
- Test: `tests/unit/recommendations/provider-selection.test.ts`

- [ ] **Step 1: Write the failing provider-selection test**

```ts
import { afterEach, describe, expect, it } from "vitest";

import { getProviderName } from "@/lib/recommendations/service";

describe("getProviderName", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER;
  });

  it("falls back when no supported provider is configured", () => {
    delete process.env.AI_PROVIDER;
    expect(getProviderName()).toBe("fallback");
  });

  it("returns openai when configured", () => {
    process.env.AI_PROVIDER = "openai";
    expect(getProviderName()).toBe("openai");
  });
});
```

- [ ] **Step 2: Run the provider-selection test to verify it fails**

Run: `npm run test -- tests/unit/recommendations/provider-selection.test.ts`  
Expected: FAIL because `getProviderName` does not exist.

- [ ] **Step 3: Implement provider selection and AI enrichment parsing**

```ts
import { recommendationEnrichmentSchema } from "@/lib/recommendations/response-schema";
import type { AIProvider } from "@/lib/ai/provider";
import { GigaChatProvider } from "@/lib/ai/gigachat-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";

export function getProviderName() {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "openai" || provider === "gigachat") {
    return provider;
  }

  return "fallback";
}

export function getProvider(): AIProvider {
  const provider = getProviderName();

  if (provider === "openai") {
    return new OpenAIProvider();
  }

  if (provider === "gigachat") {
    return new GigaChatProvider();
  }

  throw new Error("No external AI provider configured.");
}
```

```ts
const parsed = recommendationEnrichmentSchema.parse(JSON.parse(content));
return parsed;
```

```ts
import { getProvider, getProviderName } from "@/lib/recommendations/service";
import { updateRecommendationSnapshot } from "@/lib/recommendations/snapshot";

export async function enrichRecommendationSnapshot(
  snapshotId: string,
  context: RecommendationContext
) {
  const providerName = getProviderName();

  if (providerName === "fallback") {
    return null;
  }

  try {
    const provider = getProvider();
    const enriched = await provider.getRecommendations(context);

    return updateRecommendationSnapshot(snapshotId, {
      provider: providerName,
      strategy: "ai-enriched",
      status: "ready",
      result: enriched
    });
  } catch {
    return updateRecommendationSnapshot(snapshotId, {
      provider: providerName,
      status: "failed"
    });
  }
}
```

- [ ] **Step 4: Update the refresh orchestration to trigger non-blocking enrichment**

```ts
const snapshot = await createRecommendationSnapshot({
  userId,
  provider: "fallback",
  strategy: "fallback",
  status: "ready",
  triggerSource,
  contextHash,
  result: fallback
});

revalidatePath("/recommendations");
void enrichRecommendationSnapshot(snapshot.id, context);

return snapshot;
```

- [ ] **Step 5: Run the provider-selection test**

Run: `npm run test -- tests/unit/recommendations/provider-selection.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recommendations/refresh.ts src/lib/recommendations/service.ts src/lib/ai/openai-provider.ts src/lib/ai/gigachat-provider.ts tests/unit/recommendations/provider-selection.test.ts
git commit -m "feat: align AI providers with recommendation enrichment contract"
```

## Task 6: Trigger automatic snapshot refresh from user book actions

**Files:**
- Modify: `src/lib/books/actions.ts`
- Test: `tests/unit/favorites/toggle-favorite.test.ts`
- Test: `tests/unit/reading-history/record-event.test.ts`
- Test: `tests/integration/recommendations/recommendation-refresh.test.ts`

- [ ] **Step 1: Add the failing action-trigger expectation**

```ts
import { vi, describe, it, expect } from "vitest";

const { refreshRecommendationSnapshotForUser } = vi.hoisted(() => ({
  refreshRecommendationSnapshotForUser: vi.fn(async () => ({ id: "snapshot-1" }))
}));

vi.mock("@/lib/recommendations/refresh", () => ({
  refreshRecommendationSnapshotForUser
}));

import { toggleFavoriteForBook } from "@/lib/books/actions";

describe("toggleFavoriteForBook", () => {
  it("refreshes recommendation snapshot after the favorite signal is saved", async () => {
    const formData = new FormData();
    formData.set("bookId", "book-1");
    formData.set("slug", "design-of-everyday-things");

    await toggleFavoriteForBook(formData);

    expect(refreshRecommendationSnapshotForUser).toHaveBeenCalledWith(
      expect.any(String),
      "favorite"
    );
  });
});
```

- [ ] **Step 2: Run the targeted action tests to verify they fail**

Run: `npm run test -- tests/unit/favorites/toggle-favorite.test.ts tests/unit/reading-history/record-event.test.ts tests/integration/recommendations/recommendation-refresh.test.ts`  
Expected: FAIL because the public book actions do not call the refresh orchestration yet.

- [ ] **Step 3: Trigger refreshes from the centralized book actions**

```ts
import { refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";

export async function toggleFavoriteForBook(formData: FormData) {
  const user = await requireUser();

  const bookId = requireString(formData.get("bookId"), "bookId");
  const slug = requireString(formData.get("slug"), "slug");

  await toggleFavorite(bookId);
  await refreshRecommendationSnapshotForUser(user.id, "favorite");

  revalidatePath("/favorites");
  revalidatePath("/recommendations");
  revalidatePath(`/books/${slug}`);
}
```

```ts
await recordReadingEvent(bookId, "interest");
await refreshRecommendationSnapshotForUser(user.id, "interest");
```

```ts
await recordReadingEvent(bookId, "finished");
await refreshRecommendationSnapshotForUser(user.id, "finished");
```

```ts
await upsertReview({ bookId, rating, content, redirectSlug });
const user = await requireUser();
await refreshRecommendationSnapshotForUser(user.id, "review");
```

- [ ] **Step 4: Re-run the action-trigger tests**

Run: `npm run test -- tests/unit/favorites/toggle-favorite.test.ts tests/unit/reading-history/record-event.test.ts tests/integration/recommendations/recommendation-refresh.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books/actions.ts tests/unit/favorites/toggle-favorite.test.ts tests/unit/reading-history/record-event.test.ts tests/integration/recommendations/recommendation-refresh.test.ts
git commit -m "feat: auto-refresh recommendations from book signals"
```

## Task 7: Rebuild the recommendations page and cards around summaries and insights

**Files:**
- Create: `src/components/recommendations/recommendation-hero.tsx`
- Create: `src/components/recommendations/recommendation-insight-strip.tsx`
- Modify: `src/components/recommendations/recommendation-card.tsx`
- Modify: `src/app/recommendations/page.tsx`
- Test: `tests/integration/recommendations/recommendations-page.test.tsx`
- Test: `tests/e2e/recommendations-phase-b.spec.ts`

- [ ] **Step 1: Write the failing UI tests**

```ts
expect(screen.getByRole("heading", { name: "Персональные рекомендации" })).toBeInTheDocument();
expect(screen.getByText("Любимые жанры")).toBeInTheDocument();
expect(screen.getByText("author-match")).toBeInTheDocument();
expect(screen.getByText("Похожа на книги, которые вы завершили и оценили высоко.")).toBeInTheDocument();
```

```ts
import { expect, test } from "@playwright/test";

test("recommendations page shows summary, insights, and card reasons", async ({ page }) => {
  await page.goto("/recommendations");
  await expect(page.getByRole("heading", { name: "Персональные рекомендации" })).toBeVisible();
  await expect(page.getByText("Любимые жанры")).toBeVisible();
  await expect(page.getByTestId("recommendation-card").first()).toBeVisible();
});
```

- [ ] **Step 2: Run the recommendations page tests to verify they fail**

Run: `npm run test -- tests/integration/recommendations/recommendations-page.test.tsx && npm run test:e2e -- tests/e2e/recommendations-phase-b.spec.ts`  
Expected: FAIL because the hero, insight strip, and richer cards do not exist yet.

- [ ] **Step 3: Implement the new recommendation UI components**

```tsx
export function RecommendationHero({
  summary,
  strategy,
  updatedAt
}: {
  summary: string;
  strategy: string;
  updatedAt: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Reading profile</p>
      <h1 className="mt-3 text-3xl font-bold">Персональные рекомендации</h1>
      <p className="mt-4 max-w-3xl text-slate-300">{summary}</p>
      <p className="mt-3 text-sm text-slate-400">
        Стратегия: {strategy} · Обновлено: {updatedAt}
      </p>
    </section>
  );
}
```

```tsx
export function RecommendationInsightStrip({ insights }: { insights: RecommendationInsights }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Любимые жанры</p>
        <p className="mt-3 text-sm text-slate-100">{insights.favoriteGenres.join(", ") || "Нет данных"}</p>
      </article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Любимые авторы</p>
        <p className="mt-3 text-sm text-slate-100">{insights.favoriteAuthors.join(", ") || "Нет данных"}</p>
      </article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Завершённые книги</p>
        <p className="mt-3 text-sm text-slate-100">{insights.finishedBooks.join(", ") || "Нет данных"}</p>
      </article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Высоко оценённые темы</p>
        <p className="mt-3 text-sm text-slate-100">{insights.highRatedThemes.join(", ") || "Нет данных"}</p>
      </article>
    </section>
  );
}
```

```tsx
export function RecommendationCard({
  title,
  slug,
  reason,
  badge,
  coverImage,
  author
}: {
  title: string;
  slug: string;
  reason: string;
  badge?: string;
  coverImage?: string | null;
  author: string;
}) {
  return (
    <article data-testid="recommendation-card" className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <Image
        src={coverImage ?? "/covers/fallback-book.jpg"}
        alt={title}
        width={384}
        height={512}
        className="h-64 w-full rounded-xl object-cover"
      />
      <p className="mt-4 text-sm text-slate-400">{author}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      {badge ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-cyan-300">{badge}</p> : null}
      <p className="mt-3 text-slate-300">{reason}</p>
      <Link href={`/books/${slug}`} className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200">
        Перейти к книге
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Render the hero, insight strip, and richer cards from `/recommendations`**

```tsx
const snapshot = await getLatestRecommendationSnapshot(user.id);

<div className="space-y-8">
  <RecommendationHero
    summary={snapshot?.summary ?? "Рекомендации ещё не сгенерированы."}
    strategy={snapshot?.strategy ?? "fallback"}
    updatedAt={snapshot?.createdAt.toISOString() ?? "нет данных"}
  />
  {snapshot ? <RecommendationInsightStrip insights={snapshot.insights} /> : null}
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {snapshot?.items.map((item) => (
      <RecommendationCard
        key={item.id}
        title={item.book.title}
        slug={item.book.slug}
        reason={item.reason}
        badge={item.badge ?? undefined}
        coverImage={item.book.coverAssets[0]?.publicUrl ?? item.book.coverImage}
        author={item.book.authors[0]?.author.name ?? "Неизвестный автор"}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 5: Re-run the recommendations UI tests**

Run: `npm run test -- tests/integration/recommendations/recommendations-page.test.tsx && npm run test:e2e -- tests/e2e/recommendations-phase-b.spec.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/recommendations/page.tsx src/components/recommendations tests/integration/recommendations/recommendations-page.test.tsx tests/e2e/recommendations-phase-b.spec.ts
git commit -m "feat: add insight-driven recommendation experience"
```

## Task 8: Document provider setup and verify the Phase B workflow

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Document the recommendation provider workflow**

```md
## Phase B recommendations workflow

~~~bash
npm run setup
npm run dev
~~~

Set one of the providers in `.env`:

~~~env
AI_PROVIDER=fallback
OPENAI_API_KEY=
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
~~~

- recommendations regenerate automatically after favorites, reviews, and reading events;
- fallback snapshots are stored immediately;
- AI enrichment improves summary and card reasons when a provider is configured.
```

- [ ] **Step 2: Add a focused verification script**

```json
{
  "scripts": {
    "test:e2e:phase-b": "playwright test tests/e2e/recommendations-phase-b.spec.ts",
    "verify:phase-b": "npm run lint && npm run test && npm run build"
  }
}
```

- [ ] **Step 3: Run the full verification commands**

Run: `npm run verify:phase-b && npm run test:e2e:phase-b`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: add phase b recommendations workflow"
```

## Spec Coverage Check

- Deep personalization from all signals: covered by Tasks 2 and 3.
- Fast fallback snapshot first, AI later: covered by Tasks 4 and 5.
- Auto-regenerate on new signals: covered by Task 6.
- Summary plus per-card reasons: covered by Tasks 3 and 7.
- Recommendations page UI refresh: covered by Task 7.
- Provider flexibility and failure safety: covered by Tasks 1, 4, and 5.
- Testing and verification: covered by every task, especially Tasks 3, 4, 6, 7, and 8.

## Self-Review

- Placeholder scan: no `TBD`, `TODO`, "implement later", or vague "handle it appropriately" steps remain.
- Type consistency: `RecommendationContext`, `RecommendationResult`, `RecommendationInsights`, `strategy`, `status`, `triggerSource`, `contextHash`, `badge`, and `score` are named consistently across schema, service, UI, and tests.
- Scope check: this plan is limited to `Phase B: AI Recommendations` and does not pull in AR, voice, PWA, or deploy-hardening work.
