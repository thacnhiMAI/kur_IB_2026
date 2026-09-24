# Smart Library Phase E Performance + Vercel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise performance and production-readiness for the key user routes, then lock in a clear Vercel deploy path for the graduation project.

**Architecture:** Treat Phase E as a focused hardening pass, not a new feature sprint. Start by defining measurable priority routes and audit artifacts, then make the public shell cheaper to render, centralize site URL and metadata logic, tighten image delivery for the heavy book surfaces, and finish with deploy documentation plus a dedicated verification path.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, NextAuth v5, Prisma, PostgreSQL, Vitest, Playwright, Vercel

---

## File Structure

### New files

- `src/lib/site/phase-e-routes.ts` - canonical list of priority routes and their audit labels.
- `scripts/phase-e/route-baseline.ts` - helper script that prints the priority routes and produces the audit scaffold.
- `docs/operations/phase-e-route-audit.md` - working audit document for route-by-route bottlenecks and before/after notes.
- `src/components/auth/auth-nav-client.tsx` - client-side auth-aware nav used to remove `auth()` from the global layout.
- `tests/unit/auth/auth-nav-client.test.tsx` - unit tests for the client navigation shell.
- `src/lib/site/url.ts` - production base URL resolver that understands local, Vercel preview, and production domains.
- `src/lib/site/metadata.ts` - reusable metadata builders for public pages and book detail pages.
- `tests/unit/site/url.test.ts` - unit tests for base URL resolution.
- `tests/unit/site/metadata.test.ts` - unit tests for metadata helper output.
- `tests/unit/books/presenters.test.ts` - unit tests for blur placeholders and image metadata in book presenters.
- `src/lib/site/deploy-env.ts` - canonical list of required production environment variables and their descriptions.
- `scripts/phase-e/check-env.ts` - deploy-readiness helper that prints missing Vercel env values.
- `tests/unit/site/deploy-env.test.ts` - unit tests for deploy environment requirements.
- `docs/operations/vercel-deploy-phase-e.md` - step-by-step Vercel deployment guide for this project.
- `docs/operations/lighthouse-phase-e-checklist.md` - route-level Lighthouse and manual QA checklist.
- `tests/e2e/phase-e-public-routes.spec.ts` - public-route smoke test for the optimized shell and production assets.

### Modified files

- `package.json` - add Phase E scripts for verification, route audit, env check, and E2E.
- `src/app/layout.tsx` - remove global `auth()` from the shell, wire in the client nav, and use shared metadata configuration.
- `src/components/auth/auth-nav.tsx` - keep the pure presentational nav and adapt it for client-controlled state.
- `src/app/page.tsx` - add page metadata export and keep the landing route static.
- `src/app/catalog/page.tsx` - add route metadata and keep the catalog route static-friendly.
- `src/app/recommendations/page.tsx` - add route metadata/noindex handling while keeping dynamic behavior explicit.
- `src/app/manifest.ts` - reuse the shared base URL and metadata defaults.
- `src/lib/ar/urls.ts` - switch AR links from `NEXTAUTH_URL`-only behavior to the shared base URL helper.
- `src/lib/books/presenters.ts` - pass through blur placeholders and cover asset metadata needed by UI components.
- `src/lib/catalog/queries.ts` - extend catalog UI types with image optimization fields already available from the DB layer.
- `src/components/catalog/book-card.tsx` - add `sizes`, placeholder handling, and tighter image hints.
- `src/components/books/book-cover-stage.tsx` - add `priority`, `sizes`, and blur placeholder handling for the detail hero image.
- `src/components/recommendations/recommendation-card.tsx` - add `sizes` and blur placeholder support for recommendation cards.
- `src/app/recommendations/page.tsx` - pass blur data through to recommendation cards.
- `README.md` - add Phase E production and deploy instructions.
- `.env.example` - clarify Vercel-ready environment variables.

## Task 1: Define The Phase E Route Baseline

**Files:**
- Create: `src/lib/site/phase-e-routes.ts`
- Create: `scripts/phase-e/route-baseline.ts`
- Create: `docs/operations/phase-e-route-audit.md`
- Test: `tests/unit/site/phase-e-routes.test.ts`

- [ ] **Step 1: Write the failing route-baseline unit test**

```ts
import { describe, expect, it } from "vitest";

import {
  PHASE_E_PRIORITY_ROUTES,
  getPhaseERouteByPath
} from "@/lib/site/phase-e-routes";

describe("phase e routes", () => {
  it("keeps the audit routes in the agreed priority order", () => {
    expect(PHASE_E_PRIORITY_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/catalog",
      "/books/design-of-everyday-things",
      "/recommendations"
    ]);
  });

  it("returns metadata for a known route", () => {
    expect(getPhaseERouteByPath("/catalog")).toMatchObject({
      label: "Catalog",
      category: "public"
    });
  });
});
```

- [ ] **Step 2: Run the unit test to confirm it fails**

Run: `npx vitest run tests/unit/site/phase-e-routes.test.ts`

Expected: FAIL with import errors for `@/lib/site/phase-e-routes`.

- [ ] **Step 3: Implement the canonical route list**

```ts
export type PhaseERoute = {
  path: string;
  label: string;
  category: "public" | "auth";
  notes: string;
};

export const PHASE_E_PRIORITY_ROUTES: PhaseERoute[] = [
  {
    path: "/",
    label: "Home",
    category: "public",
    notes: "Landing page and first impression route."
  },
  {
    path: "/catalog",
    label: "Catalog",
    category: "public",
    notes: "Heavy card grid with premium visuals and local search."
  },
  {
    path: "/books/design-of-everyday-things",
    label: "Book Detail",
    category: "public",
    notes: "Detail route with hero image, AR entry, reviews, and actions."
  },
  {
    path: "/recommendations",
    label: "Recommendations",
    category: "auth",
    notes: "Dynamic personalized route with snapshot cards."
  }
];

export function getPhaseERouteByPath(path: string) {
  return PHASE_E_PRIORITY_ROUTES.find((route) => route.path === path) ?? null;
}
```

- [ ] **Step 4: Add the route-audit helper script**

```ts
import { PHASE_E_PRIORITY_ROUTES } from "../../src/lib/site/phase-e-routes.ts";

console.log("# Phase E Route Baseline");

for (const route of PHASE_E_PRIORITY_ROUTES) {
  console.log(`- ${route.label}: ${route.path} [${route.category}]`);
}
```

- [ ] **Step 5: Write the audit document scaffold**

```md
# Phase E Route Audit

## Routes

| Route | Category | Before notes | After notes | Lighthouse target |
| --- | --- | --- | --- | --- |
| `/` | public | Measure shell cost and metadata completeness. |  | Performance >= 90 |
| `/catalog` | public | Measure card grid image weight and client search hydration. |  | Performance >= 90 |
| `/books/design-of-everyday-things` | public | Measure hero image cost, AR entry overhead, and review block. |  | Performance >= 90 |
| `/recommendations` | auth | Measure personalized grid cost and dynamic route stability. |  | Stable auth route |
```

- [ ] **Step 6: Run the targeted test and helper script**

Run:

```bash
npx vitest run tests/unit/site/phase-e-routes.test.ts
tsx scripts/phase-e/route-baseline.ts
```

Expected:

- Vitest PASS with `2 passed`
- script prints the four agreed Phase E routes in priority order

- [ ] **Step 7: Commit the route baseline**

```bash
git add src/lib/site/phase-e-routes.ts scripts/phase-e/route-baseline.ts docs/operations/phase-e-route-audit.md tests/unit/site/phase-e-routes.test.ts
git commit -m "docs: add phase e route baseline"
```

## Task 2: Make The Global Shell Static-Friendly

**Files:**
- Create: `src/components/auth/auth-nav-client.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/auth/auth-nav.tsx`
- Test: `tests/unit/auth/auth-nav-client.test.tsx`

- [ ] **Step 1: Write the failing auth-nav client unit test**

```ts
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next-auth/react", () => ({
  getSession,
  signOut
}));

import { AuthNavClient } from "@/components/auth/auth-nav-client";

describe("AuthNavClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signed-out links before session hydration", () => {
    getSession.mockResolvedValue(null);

    render(<AuthNavClient />);

    expect(screen.getByRole("link", { name: "Gmail sign up" })).toBeInTheDocument();
  });

  it("hydrates to the signed-in nav when a session exists", async () => {
    getSession.mockResolvedValue({
      user: {
        name: "Reader",
        email: "reader@example.com",
        role: "USER"
      }
    });

    render(<AuthNavClient />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Reader" })).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npx vitest run tests/unit/auth/auth-nav-client.test.tsx`

Expected: FAIL because `AuthNavClient` does not exist.

- [ ] **Step 3: Implement the client auth nav**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";

import { AuthNav } from "@/components/auth/auth-nav";

type AuthNavUser = {
  name?: string | null;
  email?: string | null;
  role?: "USER" | "ADMIN";
} | null;

export function AuthNavClient() {
  const [user, setUser] = useState<AuthNavUser>(null);

  useEffect(() => {
    let active = true;

    void getSession().then((session) => {
      if (!active) {
        return;
      }

      setUser(
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              role: session.user.role
            }
          : null
      );
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthNav
      user={user}
      onSignOut={async () => {
        await signOut({ callbackUrl: "/" });
      }}
    />
  );
}
```

- [ ] **Step 4: Make the root layout static-friendly**

```tsx
import { AuthNavClient } from "@/components/auth/auth-nav-client";
import { buildRootMetadata } from "@/lib/site/metadata";

export const metadata = buildRootMetadata();

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <PwaBootstrap />
        <script dangerouslySetInnerHTML={{ __html: OFFLINE_BANNER_SCRIPT }} />
        <OfflineStatusBanner />
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Умная библиотека
            </Link>
            <AuthNavClient />
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Keep the presentational nav reusable**

```tsx
type AuthNavProps = {
  user:
    | {
        name?: string | null;
        email?: string | null;
        role?: "USER" | "ADMIN";
      }
    | null;
  onSignOut: () => Promise<void>;
};
```

Keep `AuthNav` presentational only. Do not keep `auth()` or server actions in the root layout.

- [ ] **Step 6: Run the auth-nav client test**

Run: `npx vitest run tests/unit/auth/auth-nav-client.test.tsx tests/unit/auth/auth-nav.test.tsx`

Expected: PASS with both the new hydration test and the existing presentational nav test green.

- [ ] **Step 7: Commit the shell optimization**

```bash
git add src/components/auth/auth-nav-client.tsx src/components/auth/auth-nav.tsx src/app/layout.tsx tests/unit/auth/auth-nav-client.test.tsx
git commit -m "perf: remove global auth call from root shell"
```

## Task 3: Centralize Base URL And Metadata

**Files:**
- Create: `src/lib/site/url.ts`
- Create: `src/lib/site/metadata.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/catalog/page.tsx`
- Modify: `src/app/recommendations/page.tsx`
- Modify: `src/app/manifest.ts`
- Modify: `src/lib/ar/urls.ts`
- Modify: `src/app/books/[slug]/page.tsx`
- Test: `tests/unit/site/url.test.ts`
- Test: `tests/unit/site/metadata.test.ts`

- [ ] **Step 1: Write the failing URL and metadata unit tests**

```ts
import { describe, expect, it } from "vitest";

import { buildBookMetadata, buildPageMetadata } from "@/lib/site/metadata";
import { getBaseUrl } from "@/lib/site/url";

describe("site url", () => {
  it("prefers NEXTAUTH_URL when present", () => {
    expect(
      getBaseUrl({
        NEXTAUTH_URL: "https://smart-library.example",
        VERCEL_URL: "preview.vercel.app"
      })
    ).toBe("https://smart-library.example");
  });

  it("falls back to https://VERCEL_URL in preview environments", () => {
    expect(getBaseUrl({ VERCEL_URL: "smart-library-preview.vercel.app" })).toBe(
      "https://smart-library-preview.vercel.app"
    );
  });
});

describe("site metadata", () => {
  it("builds page metadata with canonical URLs", () => {
    const metadata = buildPageMetadata({
      title: "Каталог",
      description: "Каталог книг",
      path: "/catalog",
      baseUrl: "https://smart-library.example"
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://smart-library.example/catalog"
    );
  });

  it("builds book metadata with Open Graph image support", () => {
    const metadata = buildBookMetadata({
      title: "Дизайн привычных вещей",
      description: "Книга о проектировании.",
      path: "/books/design-of-everyday-things",
      baseUrl: "https://smart-library.example",
      imagePath: "/covers/design-of-everyday-things.jpg"
    });

    expect(metadata.openGraph?.images?.[0]?.url).toBe(
      "https://smart-library.example/covers/design-of-everyday-things.jpg"
    );
  });
});
```

- [ ] **Step 2: Run the unit tests to confirm they fail**

Run: `npx vitest run tests/unit/site/url.test.ts tests/unit/site/metadata.test.ts`

Expected: FAIL because `@/lib/site/url` and `@/lib/site/metadata` do not exist.

- [ ] **Step 3: Implement the base URL resolver**

```ts
type UrlEnv = {
  NEXTAUTH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

export function getBaseUrl(env: UrlEnv = process.env) {
  if (env.NEXTAUTH_URL) {
    return env.NEXTAUTH_URL.replace(/\/+$/, "");
  }

  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`;
  }

  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }

  return "http://localhost:3000";
}
```

- [ ] **Step 4: Implement reusable metadata builders**

```ts
import type { Metadata } from "next";

export function buildRootMetadata(): Metadata {
  const baseUrl = getBaseUrl();

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "Умная библиотека",
      template: "%s | Умная библиотека"
    },
    description: "Каталог книг с персональными рекомендациями, AR-превью, голосовым поиском и PWA.",
    openGraph: {
      type: "website",
      siteName: "Умная библиотека",
      locale: "ru_RU"
    }
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  baseUrl = getBaseUrl(),
  noIndex = false
}: {
  title: string;
  description: string;
  path: string;
  baseUrl?: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = `${baseUrl}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical
    }
  };
}
```

- [ ] **Step 5: Apply metadata to the priority routes**

```tsx
// src/app/page.tsx
import { buildPageMetadata } from "@/lib/site/metadata";

export const metadata = buildPageMetadata({
  title: "Главная",
  description: "Каталог книг, рекомендации, AR-превью и PWA-функции выпускного проекта.",
  path: "/"
});
```

```tsx
// src/app/catalog/page.tsx
export const metadata = buildPageMetadata({
  title: "Каталог",
  description: "Каталог книг с фильтрами, обложками и локальным голосовым поиском.",
  path: "/catalog"
});
```

```tsx
// src/app/recommendations/page.tsx
export const metadata = buildPageMetadata({
  title: "Рекомендации",
  description: "Персональные рекомендации на основе избранного, истории чтения и отзывов.",
  path: "/recommendations",
  noIndex: true
});
```

```tsx
// src/app/books/[slug]/page.tsx
export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);

  if (!book) {
    return buildPageMetadata({
      title: "Книга не найдена",
      description: "Запрошенная книга не найдена в каталоге.",
      path: `/books/${slug}`,
      noIndex: true
    });
  }

  return buildBookMetadata({
    title: book.title,
    description: book.description,
    path: `/books/${book.slug}`,
    imagePath: book.coverImage ?? undefined
  });
}
```

- [ ] **Step 6: Reuse the base URL helper in manifest and AR URL building**

```ts
// src/lib/ar/urls.ts
import { getBaseUrl } from "@/lib/site/url";

export function createArBookUrl(slug: string, baseUrl?: string) {
  const origin = baseUrl ?? getBaseUrl();
  return `${origin}/ar/books/${slug}`;
}
```

- [ ] **Step 7: Run the metadata and URL tests**

Run: `npx vitest run tests/unit/site/url.test.ts tests/unit/site/metadata.test.ts`

Expected: PASS with canonical URL, Vercel URL fallback, and Open Graph image assertions green.

- [ ] **Step 8: Commit the metadata hardening**

```bash
git add src/lib/site/url.ts src/lib/site/metadata.ts src/app/layout.tsx src/app/page.tsx src/app/catalog/page.tsx src/app/recommendations/page.tsx src/app/manifest.ts src/lib/ar/urls.ts src/app/books/[slug]/page.tsx tests/unit/site/url.test.ts tests/unit/site/metadata.test.ts
git commit -m "feat: add phase e metadata and base url helpers"
```

## Task 4: Tighten Image Delivery On Heavy Routes

**Files:**
- Modify: `src/lib/books/presenters.ts`
- Modify: `src/lib/catalog/queries.ts`
- Modify: `src/components/catalog/book-card.tsx`
- Modify: `src/components/books/book-cover-stage.tsx`
- Modify: `src/components/recommendations/recommendation-card.tsx`
- Modify: `src/app/recommendations/page.tsx`
- Test: `tests/unit/books/presenters.test.ts`
- Test: `tests/integration/catalog/catalog-page.test.tsx`
- Test: `tests/integration/catalog/book-detail-page.test.tsx`
- Test: `tests/integration/recommendations/recommendations-page.test.tsx`

- [ ] **Step 1: Write the failing presenter unit test**

```ts
import { describe, expect, it } from "vitest";

import { toCatalogBookCard } from "@/lib/books/presenters";

describe("book presenters", () => {
  it("prefers cached cover assets and keeps blur placeholder data", () => {
    const result = toCatalogBookCard({
      id: "book-1",
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: null,
      description: "Книга о проектировании.",
      year: 2013,
      coverImage: null,
      isFeatured: true,
      authors: [{ author: { name: "Дон Норман", slug: "don-norman" } }],
      genres: [{ genre: { name: "Дизайн", slug: "design" } }],
      coverAssets: [
        {
          publicUrl: "/covers/design-of-everyday-things.jpg",
          dominantColor: "#112233",
          blurDataUrl: "data:image/jpeg;base64,AAA=",
          status: "ready"
        }
      ]
    } as never);

    expect(result.coverImage).toBe("/covers/design-of-everyday-things.jpg");
    expect(result.blurDataUrl).toBe("data:image/jpeg;base64,AAA=");
  });
});
```

- [ ] **Step 2: Run the presenter test to verify it fails**

Run: `npx vitest run tests/unit/books/presenters.test.ts`

Expected: FAIL because the presenter test file or blur placeholder mapping does not exist yet.

- [ ] **Step 3: Extend the presenter output with blur placeholders**

```ts
// src/lib/catalog/queries.ts
export type CatalogBookCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  year: number;
  coverImage: string | null;
  dominantColor: string;
  blurDataUrl: string | null;
  authors: string[];
  genres: string[];
  isFeatured: boolean;
};
```

```ts
// src/lib/books/presenters.ts
return {
  id: book.id,
  slug: book.slug,
  title: book.title,
  subtitle: book.subtitle,
  description: book.description,
  year: book.year,
  coverImage: primaryCover?.publicUrl ?? book.coverImage,
  dominantColor: primaryCover?.dominantColor ?? "#0F172A",
  blurDataUrl: primaryCover?.blurDataUrl ?? null,
  authors: book.authors.map((entry) => entry.author.name),
  genres: book.genres.map((entry) => entry.genre.name),
  isFeatured: book.isFeatured
};
```

- [ ] **Step 4: Add route-specific image hints**

```tsx
// src/components/catalog/book-card.tsx
<Image
  src={coverImage ?? FALLBACK_COVER}
  alt={title}
  width={720}
  height={1080}
  sizes={isFeatured ? "(max-width: 768px) 100vw, 420px" : "(max-width: 768px) 50vw, 360px"}
  placeholder={blurDataUrl ? "blur" : "empty"}
  blurDataURL={blurDataUrl ?? undefined}
  className={[...].join(" ")}
/>
```

```tsx
// src/components/books/book-cover-stage.tsx
<Image
  src={coverImage ?? FALLBACK_COVER}
  alt={title}
  width={960}
  height={1440}
  priority
  sizes="(max-width: 1280px) 100vw, 380px"
  placeholder={blurDataUrl ? "blur" : "empty"}
  blurDataURL={blurDataUrl ?? undefined}
  className="..."
/>
```

```tsx
// src/components/recommendations/recommendation-card.tsx
<Image
  src={coverImage ?? FALLBACK_COVER}
  alt={title}
  width={512}
  height={768}
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 320px"
  placeholder={blurDataUrl ? "blur" : "empty"}
  blurDataURL={blurDataUrl ?? undefined}
  className="h-72 w-full rounded-[18px] object-cover"
/>
```

- [ ] **Step 5: Pass the blur metadata through the recommendations page**

```tsx
<SearchableRecommendationsGrid
  items={snapshot.items.map((item) => ({
    id: item.id,
    slug: item.book.slug,
    title: item.book.title,
    subtitle: null,
    authors: item.book.authors.map((entry) => entry.author.name),
    description: "",
    reason: item.reason,
    badge: item.badge ?? undefined,
    score: item.score,
    coverImage: item.book.coverAssets[0]?.publicUrl ?? item.book.coverImage,
    blurDataUrl: item.book.coverAssets[0]?.blurDataUrl ?? null
  }))} 
/>
```

- [ ] **Step 6: Extend the existing integration tests to assert image hints**

```ts
expect(screen.getAllByAltText("Дизайн привычных вещей")[0]).toHaveAttribute(
  "sizes"
);
```

For the detail page and recommendations page, assert that the hero/recommendation images still render with the cached cover path after the optimization changes.

- [ ] **Step 7: Run the targeted tests**

Run:

```bash
npx vitest run tests/unit/books/presenters.test.ts tests/integration/catalog/catalog-page.test.tsx tests/integration/catalog/book-detail-page.test.tsx tests/integration/recommendations/recommendations-page.test.tsx
```

Expected: PASS with the presenter blur placeholder test green and the existing route integration tests still passing.

- [ ] **Step 8: Commit the image optimizations**

```bash
git add src/lib/books/presenters.ts src/lib/catalog/queries.ts src/components/catalog/book-card.tsx src/components/books/book-cover-stage.tsx src/components/recommendations/recommendation-card.tsx src/app/recommendations/page.tsx tests/unit/books/presenters.test.ts tests/integration/catalog/catalog-page.test.tsx tests/integration/catalog/book-detail-page.test.tsx tests/integration/recommendations/recommendations-page.test.tsx
git commit -m "perf: tighten image delivery on priority routes"
```

## Task 5: Harden Production Env And Vercel Deploy Guidance

**Files:**
- Create: `src/lib/site/deploy-env.ts`
- Create: `scripts/phase-e/check-env.ts`
- Create: `docs/operations/vercel-deploy-phase-e.md`
- Modify: `.env.example`
- Modify: `README.md`
- Test: `tests/unit/site/deploy-env.test.ts`

- [ ] **Step 1: Write the failing deploy-env unit test**

```ts
import { describe, expect, it } from "vitest";

import {
  REQUIRED_VERCEL_ENV,
  getOptionalAiEnv
} from "@/lib/site/deploy-env";

describe("deploy env", () => {
  it("lists the required production environment variables", () => {
    expect(REQUIRED_VERCEL_ENV.map((entry) => entry.key)).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET",
      "NEXTAUTH_URL"
    ]);
  });

  it("keeps AI provider credentials optional", () => {
    expect(getOptionalAiEnv()).toContain("OPENAI_API_KEY");
  });
});
```

- [ ] **Step 2: Run the deploy-env unit test to verify it fails**

Run: `npx vitest run tests/unit/site/deploy-env.test.ts`

Expected: FAIL because `@/lib/site/deploy-env` does not exist.

- [ ] **Step 3: Implement the deploy environment contract**

```ts
export const REQUIRED_VERCEL_ENV = [
  {
    key: "DATABASE_URL",
    description: "Production PostgreSQL connection string reachable from Vercel."
  },
  {
    key: "AUTH_SECRET",
    description: "Auth.js signing secret."
  },
  {
    key: "NEXTAUTH_URL",
    description: "Canonical production URL for callbacks and generated links."
  }
] as const;

export function getOptionalAiEnv() {
  return [
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "GIGACHAT_CLIENT_ID",
    "GIGACHAT_CLIENT_SECRET"
  ];
}
```

- [ ] **Step 4: Add the env-check helper script**

```ts
import { REQUIRED_VERCEL_ENV, getOptionalAiEnv } from "../../src/lib/site/deploy-env.ts";

const missing = REQUIRED_VERCEL_ENV.filter((entry) => !process.env[entry.key]);

if (missing.length > 0) {
  console.error("Missing required Vercel env values:");
  for (const entry of missing) {
    console.error(`- ${entry.key}: ${entry.description}`);
  }
  process.exit(1);
}

console.log("Required Vercel env values are present.");
console.log(`Optional AI env: ${getOptionalAiEnv().join(", ")}`);
```

- [ ] **Step 5: Tighten `.env.example` and the deploy docs**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_library"
AUTH_SECRET="replace-with-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AI_PROVIDER=fallback
OPENAI_API_KEY=
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
VERCEL_PROJECT_PRODUCTION_URL=
```

```md
# Vercel Deploy Guide

1. Prepare a PostgreSQL instance reachable from Vercel.
2. Set `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL`.
3. Add Google OAuth redirect URIs for the production domain.
4. Run `npm run db:deploy` against the production database before the first public launch.
5. Redeploy after updating env values or Prisma schema.
```

- [ ] **Step 6: Run the deploy-env unit test and helper script**

Run:

```bash
npx vitest run tests/unit/site/deploy-env.test.ts
tsx scripts/phase-e/check-env.ts
```

Expected:

- Vitest PASS for the env contract
- env script exits non-zero locally until required production env values are configured, which is expected outside production

- [ ] **Step 7: Commit the deploy hardening docs**

```bash
git add src/lib/site/deploy-env.ts scripts/phase-e/check-env.ts docs/operations/vercel-deploy-phase-e.md .env.example README.md tests/unit/site/deploy-env.test.ts
git commit -m "docs: add phase e deploy readiness guidance"
```

## Task 6: Add Phase E Verification And Final Public-Route Smoke Coverage

**Files:**
- Create: `docs/operations/lighthouse-phase-e-checklist.md`
- Create: `tests/e2e/phase-e-public-routes.spec.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write the Phase E Playwright spec**

```ts
import { expect, test } from "@playwright/test";

test("phase e public routes keep shell, metadata assets, and key navigation working", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Умная библиотека" })
  ).toBeVisible();
  await expect(page.locator("link[rel='manifest']")).toHaveCount(1);

  await page.getByRole("link", { name: "Каталог" }).first().click();
  await expect(page).toHaveURL(/\/catalog/);
  await expect(page.getByLabel("Быстрый поиск")).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "AR Preview" })).toBeVisible();
});
```

- [ ] **Step 2: Add the Phase E scripts**

```json
{
  "scripts": {
    "audit:phase-e:routes": "tsx scripts/phase-e/route-baseline.ts",
    "check:env:phase-e": "tsx scripts/phase-e/check-env.ts",
    "verify:phase-e": "npm run lint && npm run test && npm run build",
    "test:e2e:phase-e": "powershell -NoProfile -Command \"$env:PLAYWRIGHT_HOST='127.0.0.1'; $env:PLAYWRIGHT_PORT='3001'; $env:NEXTAUTH_URL='http://127.0.0.1:3001'; npx playwright test tests/e2e/phase-e-public-routes.spec.ts\""
  }
}
```

- [ ] **Step 3: Write the Lighthouse checklist artifact**

```md
# Phase E Lighthouse Checklist

## Target routes

- `/`
- `/catalog`
- `/books/design-of-everyday-things`

## Target scores

- Performance >= 90
- Accessibility high, no obvious blocking issues
- Best Practices high
- SEO high for public routes

## Manual capture steps

1. Run `npm run dev`.
2. Open Chrome DevTools Lighthouse or run `npx lighthouse http://127.0.0.1:3000/catalog --only-categories=performance,accessibility,best-practices,seo`.
3. Record the score and the top three regressions for each route.
4. Update `docs/operations/phase-e-route-audit.md` with before/after notes.
```

- [ ] **Step 4: Update the README Phase E section**

````md
## Phase E Performance + Vercel

```bash
npm run audit:phase-e:routes
npm run verify:phase-e
npm run test:e2e:phase-e
```

- `audit:phase-e:routes` prints the priority route list for the final optimization pass;
- `verify:phase-e` runs lint, Vitest, and production build;
- `test:e2e:phase-e` smoke-tests the optimized public routes on the Playwright dev server;
- `docs/operations/vercel-deploy-phase-e.md` explains the production deploy flow;
- `docs/operations/lighthouse-phase-e-checklist.md` captures the final performance review steps.
````

- [ ] **Step 5: Run the final verification**

Run:

```bash
npm run verify:phase-e
npm run test:e2e:phase-e
```

Expected:

- lint PASS
- Vitest PASS
- Next production build PASS
- Playwright PASS for `phase-e-public-routes.spec.ts`

- [ ] **Step 6: Commit the Phase E verification layer**

```bash
git add docs/operations/lighthouse-phase-e-checklist.md tests/e2e/phase-e-public-routes.spec.ts package.json README.md
git commit -m "test: add phase e verification workflow"
```

## Spec Coverage Check

- Route audit and bottleneck baseline: covered by Task 1.
- Public shell and render-boundary optimization: covered by Task 2.
- Metadata, base URL handling, and deploy-safe canonical links: covered by Task 3.
- Asset and image delivery optimization for priority routes: covered by Task 4.
- Production env contract, deploy checklist, and Vercel guidance: covered by Task 5.
- Final verification scripts, Lighthouse checklist, and public-route smoke test: covered by Task 6.

## Placeholder Scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Each task contains exact paths, commands, and concrete code or document content.

## Type Consistency Check

- `PHASE_E_PRIORITY_ROUTES` and `getPhaseERouteByPath()` are introduced in Task 1 and reused consistently.
- `getBaseUrl()` and the metadata builders are defined in Task 3 before later tasks depend on them.
- `REQUIRED_VERCEL_ENV` and `getOptionalAiEnv()` are defined in Task 5 and reused by the env-check script.
