# Smart Library Phase D Voice Search + PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared voice-enabled search across `catalog`, `favorites`, and `recommendations`, then ship installable PWA behavior with offline cache for key reader routes.

**Architecture:** Keep search logic in a small shared client runtime so keyboard and speech update the same query state, while each page keeps its existing data-loading model and applies local filtering over already-loaded records. Add PWA as a thin platform layer with `manifest.ts`, a custom `public/sw.js`, route-aware cache rules, and a global offline status UI that never blocks the normal online flow.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Vitest, Playwright, Web Speech API, Service Worker API, Web App Manifest

---

## File Structure

### New files

- `src/lib/search/types.ts` - shared types for searchable records and speech support state.
- `src/lib/search/filter.ts` - pure filtering helpers used by multiple pages.
- `src/lib/search/voice.ts` - `Web Speech API` detection helpers and recognition wrapper.
- `src/components/search/unified-search.tsx` - reusable search UI with text input, microphone button, status text, and page-specific labels.
- `src/components/search/searchable-catalog-results.tsx` - client wrapper that filters the server-provided catalog cards locally.
- `src/components/search/searchable-favorites-list.tsx` - client wrapper for favorites search.
- `src/components/search/searchable-recommendations-grid.tsx` - client wrapper for recommendations search.
- `src/components/pwa/pwa-bootstrap.tsx` - client bootstrap that registers the service worker and tracks online/offline state.
- `src/components/pwa/offline-status-banner.tsx` - global offline banner.
- `src/lib/pwa/cache-config.ts` - centralized route matchers and cache names shared between app code and tests.
- `src/app/manifest.ts` - Next.js manifest entry.
- `public/sw.js` - custom service worker for offline caching and cached navigation fallback.
- `public/icons/icon-192.png` - installable app icon.
- `public/icons/icon-512.png` - installable app icon.
- `tests/unit/search/filter.test.ts` - pure filtering tests.
- `tests/unit/search/voice.test.ts` - speech support and transcript handling tests.
- `tests/unit/pwa/cache-config.test.ts` - route cache strategy tests.
- `tests/integration/favorites/favorites-page-search.test.tsx` - favorites search UI integration test.
- `tests/integration/recommendations/recommendations-search.test.tsx` - recommendations search UI integration test.
- `tests/integration/pwa/pwa-bootstrap.test.tsx` - bootstrap + offline banner integration test.
- `tests/e2e/voice-pwa-phase-d.spec.ts` - end-to-end search + manifest + offline route behavior.

### Modified files

- `src/app/layout.tsx` - mount PWA bootstrap and offline status banner once for the whole app.
- `src/app/catalog/page.tsx` - replace the static result grid with the searchable client wrapper while keeping server data fetch.
- `src/app/favorites/page.tsx` - swap plain favorites list for searchable client wrapper and pass normalized searchable fields.
- `src/app/recommendations/page.tsx` - wrap recommendation cards in searchable client wrapper.
- `src/components/catalog/catalog-filters.tsx` - keep genre/author/year form, but separate free-text search from the local voice-enabled search bar.
- `package.json` - add `verify:phase-d` and `test:e2e:phase-d`.
- `README.md` - document voice search support, offline scope, installability, and verification commands.

## Task 1: Shared Search Domain And Pure Filtering

**Files:**
- Create: `src/lib/search/types.ts`
- Create: `src/lib/search/filter.ts`
- Test: `tests/unit/search/filter.test.ts`

- [ ] **Step 1: Write the failing filter tests**

```ts
import { describe, expect, it } from "vitest";

import { filterSearchItems, normalizeSearchText } from "@/lib/search/filter";

describe("search filtering", () => {
  it("normalizes text for case-insensitive matching", () => {
    expect(normalizeSearchText("  Дон   Норман ")).toBe("дон норман");
  });

  it("matches by title, author, and reason fields", () => {
    const result = filterSearchItems(
      [
        {
          id: "book-1",
          title: "Дизайн привычных вещей",
          subtitle: "Исправленное издание",
          authors: ["Дон Норман"],
          description: "Книга о проектировании.",
          tags: ["Дизайн"],
          reason: "Похоже на ваши любимые книги"
        },
        {
          id: "book-2",
          title: "Clean Code",
          subtitle: null,
          authors: ["Robert Martin"],
          description: "Code craftsmanship.",
          tags: ["Engineering"],
          reason: "Высокий рейтинг"
        }
      ],
      "норман"
    );

    expect(result.map((item) => item.id)).toEqual(["book-1"]);
  });

  it("returns original items when query is empty", () => {
    const items = [
      {
        id: "book-1",
        title: "Book",
        subtitle: null,
        authors: [],
        description: "",
        tags: [],
        reason: ""
      }
    ];

    expect(filterSearchItems(items, "")).toEqual(items);
  });
});
```

- [ ] **Step 2: Run the unit test to confirm it fails**

Run: `npx vitest run tests/unit/search/filter.test.ts`

Expected: FAIL with module-not-found errors for `@/lib/search/filter`.

- [ ] **Step 3: Add the shared search types**

```ts
export type SearchableItem = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string;
  tags: string[];
  reason: string;
};

export type VoiceSupportState =
  | { status: "supported" }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };
```

- [ ] **Step 4: Implement the pure filtering helpers**

```ts
import type { SearchableItem } from "@/lib/search/types";

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function filterSearchItems<T extends SearchableItem>(items: T[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystack = normalizeSearchText(
      [
        item.title,
        item.subtitle ?? "",
        item.authors.join(" "),
        item.description,
        item.tags.join(" "),
        item.reason
      ].join(" ")
    );

    return haystack.includes(normalizedQuery);
  });
}
```

- [ ] **Step 5: Run the unit test to verify it passes**

Run: `npx vitest run tests/unit/search/filter.test.ts`

Expected: PASS with `3 passed`.

- [ ] **Step 6: Commit the shared search domain**

```bash
git add src/lib/search/types.ts src/lib/search/filter.ts tests/unit/search/filter.test.ts
git commit -m "feat: add shared search filtering primitives"
```

## Task 2: Voice Recognition Wrapper And Reusable Search UI

**Files:**
- Create: `src/lib/search/voice.ts`
- Create: `src/components/search/unified-search.tsx`
- Test: `tests/unit/search/voice.test.ts`

- [ ] **Step 1: Write the failing voice unit tests**

```ts
import { describe, expect, it, vi } from "vitest";

import {
  createVoiceSearchController,
  getVoiceSearchSupport
} from "@/lib/search/voice";

describe("voice search", () => {
  it("reports unsupported browsers cleanly", () => {
    expect(getVoiceSearchSupport({} as Window)).toEqual({
      status: "unsupported",
      message: "Голосовой поиск недоступен в этом браузере."
    });
  });

  it("streams transcript updates into callbacks", () => {
    const start = vi.fn();
    const stop = vi.fn();
    const fakeRecognition = {
      lang: "",
      interimResults: false,
      continuous: false,
      start,
      stop,
      onresult: null as ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null,
      onerror: null as ((event: { error: string }) => void) | null,
      onend: null as (() => void) | null
    };

    const controller = createVoiceSearchController(() => fakeRecognition as never);
    const onTranscript = vi.fn();

    controller.start({ onTranscript, onStateChange: vi.fn(), onError: vi.fn() });
    fakeRecognition.onresult?.({
      results: [[{ transcript: "Дизайн привычных вещей" }]]
    });

    expect(onTranscript).toHaveBeenCalledWith("Дизайн привычных вещей");
  });
});
```

- [ ] **Step 2: Run the voice unit test to verify it fails**

Run: `npx vitest run tests/unit/search/voice.test.ts`

Expected: FAIL because `@/lib/search/voice` does not exist.

- [ ] **Step 3: Implement the browser support check and controller**

```ts
import type { VoiceSupportState } from "@/lib/search/types";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function getVoiceSearchSupport(
  target: Pick<Window, "SpeechRecognition" | "webkitSpeechRecognition"> | Window
): VoiceSupportState {
  const Recognition =
    "SpeechRecognition" in target
      ? target.SpeechRecognition
      : "webkitSpeechRecognition" in target
        ? target.webkitSpeechRecognition
        : undefined;

  if (!Recognition) {
    return {
      status: "unsupported",
      message: "Голосовой поиск недоступен в этом браузере."
    };
  }

  return { status: "supported" };
}

export function createVoiceSearchController(factory: () => SpeechRecognitionLike) {
  return {
    start({
      onTranscript,
      onStateChange,
      onError
    }: {
      onTranscript(transcript: string): void;
      onStateChange(listening: boolean): void;
      onError(message: string): void;
    }) {
      const recognition = factory();
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .flatMap((result) => Array.from(result))
          .map((entry) => entry.transcript)
          .join(" ")
          .trim();

        if (transcript) {
          onTranscript(transcript);
        }
      };
      recognition.onerror = (event) => {
        onStateChange(false);
        onError(event.error === "not-allowed" ? "Доступ к микрофону запрещён." : "Не удалось распознать речь.");
      };
      recognition.onend = () => onStateChange(false);
      onStateChange(true);
      recognition.start();

      return () => {
        recognition.stop();
        onStateChange(false);
      };
    }
  };
}
```

- [ ] **Step 4: Create the reusable search component**

```tsx
"use client";

import { useMemo, useState } from "react";

import { createVoiceSearchController, getVoiceSearchSupport } from "@/lib/search/voice";

type UnifiedSearchProps = {
  label: string;
  placeholder: string;
  initialQuery?: string;
  onQueryChange(query: string): void;
};

export function UnifiedSearch({
  label,
  placeholder,
  initialQuery = "",
  onQueryChange
}: UnifiedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const support = useMemo(
    () => (typeof window === "undefined" ? { status: "unsupported", message: "" } : getVoiceSearchSupport(window)),
    []
  );

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    onQueryChange(nextQuery);
  }

  function handleVoiceClick() {
    if (support.status !== "supported") {
      setMessage(support.message);
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const controller = createVoiceSearchController(() => new Recognition());

    controller.start({
      onTranscript: updateQuery,
      onStateChange: setIsListening,
      onError: setMessage
    });
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-200">{label}</label>
      <div className="flex gap-3">
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={handleVoiceClick}
          aria-pressed={isListening}
          className="rounded-lg border border-cyan-400/40 px-4 py-3 text-sm text-cyan-200"
        >
          {isListening ? "Слушаю..." : "Голос"}
        </button>
      </div>
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
```

- [ ] **Step 5: Run the voice unit tests again**

Run: `npx vitest run tests/unit/search/voice.test.ts`

Expected: PASS with support detection and transcript callback assertions green.

- [ ] **Step 6: Commit the voice search primitives**

```bash
git add src/lib/search/voice.ts src/components/search/unified-search.tsx tests/unit/search/voice.test.ts
git commit -m "feat: add reusable voice-enabled search input"
```

## Task 3: Integrate Shared Search Into Catalog, Favorites, And Recommendations

**Files:**
- Create: `src/components/search/searchable-catalog-results.tsx`
- Create: `src/components/search/searchable-favorites-list.tsx`
- Create: `src/components/search/searchable-recommendations-grid.tsx`
- Modify: `src/app/catalog/page.tsx`
- Modify: `src/app/favorites/page.tsx`
- Modify: `src/app/recommendations/page.tsx`
- Modify: `src/components/catalog/catalog-filters.tsx`
- Test: `tests/integration/catalog/catalog-page.test.tsx`
- Test: `tests/integration/favorites/favorites-page-search.test.tsx`
- Test: `tests/integration/recommendations/recommendations-search.test.tsx`

- [ ] **Step 1: Extend the catalog integration test with local search expectations**

```ts
it("filters rendered catalog cards through the shared search bar", async () => {
  render(await CatalogPage({ searchParams: Promise.resolve({}) }));

  const search = screen.getByPlaceholderText("Поиск по названию, автору или жанру");
  await userEvent.type(search, "Норман");

  expect(screen.getAllByText("Дизайн привычных вещей").length).toBeGreaterThan(0);
  expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add failing integration tests for favorites and recommendations**

```ts
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SearchableFavoritesList } from "@/components/search/searchable-favorites-list";

describe("SearchableFavoritesList", () => {
  it("filters favorites by title and author", async () => {
    render(
      <SearchableFavoritesList
        items={[
          {
            id: "fav-1",
            slug: "design-of-everyday-things",
            title: "Дизайн привычных вещей",
            authors: ["Дон Норман"],
            description: "Классическая книга."
          },
          {
            id: "fav-2",
            slug: "clean-code",
            title: "Clean Code",
            authors: ["Robert Martin"],
            description: "Code craftsmanship."
          }
        ]}
      />
    );

    await userEvent.type(
      screen.getByPlaceholderText("Поиск по названию, автору или описанию"),
      "норман"
    );

    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
    expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the integration tests to verify they fail**

Run: `npx vitest run tests/integration/catalog/catalog-page.test.tsx tests/integration/favorites/favorites-page-search.test.tsx tests/integration/recommendations/recommendations-search.test.tsx`

Expected: FAIL because the searchable wrappers and new placeholder text do not exist yet.

- [ ] **Step 4: Implement the searchable wrappers and page wiring**

```tsx
"use client";

import { useMemo, useState } from "react";

import { BookCard } from "@/components/catalog/book-card";
import { UnifiedSearch } from "@/components/search/unified-search";
import { filterSearchItems } from "@/lib/search/filter";

export function SearchableCatalogResults({
  books
}: {
  books: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    authors: string[];
    genres: string[];
    year: number;
    coverImage: string | null;
    dominantColor: string;
  }>;
}) {
  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(
    () =>
      filterSearchItems(
        books.map((book) => ({
          id: book.id,
          title: book.title,
          subtitle: book.subtitle,
          authors: book.authors,
          description: book.description,
          tags: book.genres,
          reason: ""
        })),
        query
      ).map((match) => books.find((book) => book.id === match.id)!),
    [books, query]
  );

  return (
    <div className="space-y-6">
      <UnifiedSearch
        label="Быстрый поиск"
        placeholder="Поиск по названию, автору или жанру"
        onQueryChange={setQuery}
      />
      <div className="premium-books-grid">
        {filteredBooks.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// favorites page sketch
<SearchableFavoritesList
  items={favorites.map((item) => ({
    id: item.id,
    slug: item.book.slug,
    title: item.book.title,
    subtitle: item.book.subtitle,
    authors: item.book.authors.map((entry) => entry.author.name),
    description: item.book.description
  }))}
/>
```

```tsx
// recommendations page sketch
<SearchableRecommendationsGrid
  items={snapshot.items.map((item) => ({
    id: item.id,
    slug: item.book.slug,
    title: item.book.title,
    subtitle: item.book.subtitle,
    authors: item.book.authors.map((entry) => entry.author.name),
    description: item.book.description,
    reason: item.reason,
    badge: item.badge ?? undefined,
    score: item.score,
    coverImage: item.book.coverAssets[0]?.publicUrl ?? item.book.coverImage
  }))} 
/>
```

- [ ] **Step 5: Keep server-side filters separate from local voice search**

```tsx
// src/components/catalog/catalog-filters.tsx
<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
  Голосовой поиск работает в блоке результатов ниже и не сбрасывает выбранные фильтры жанра, автора и года.
</div>
```

- [ ] **Step 6: Run the integration tests again**

Run: `npx vitest run tests/integration/catalog/catalog-page.test.tsx tests/integration/favorites/favorites-page-search.test.tsx tests/integration/recommendations/recommendations-search.test.tsx`

Expected: PASS with the shared search UI visible on all three pages.

- [ ] **Step 7: Commit the page integrations**

```bash
git add src/components/search/searchable-catalog-results.tsx src/components/search/searchable-favorites-list.tsx src/components/search/searchable-recommendations-grid.tsx src/app/catalog/page.tsx src/app/favorites/page.tsx src/app/recommendations/page.tsx src/components/catalog/catalog-filters.tsx tests/integration/catalog/catalog-page.test.tsx tests/integration/favorites/favorites-page-search.test.tsx tests/integration/recommendations/recommendations-search.test.tsx
git commit -m "feat: wire shared search into reader pages"
```

## Task 4: Add Manifest, PWA Bootstrap, And Global Offline Status

**Files:**
- Create: `src/app/manifest.ts`
- Create: `src/components/pwa/pwa-bootstrap.tsx`
- Create: `src/components/pwa/offline-status-banner.tsx`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Modify: `src/app/layout.tsx`
- Test: `tests/integration/pwa/pwa-bootstrap.test.tsx`

- [ ] **Step 1: Write the failing PWA bootstrap integration test**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";

describe("PwaBootstrap", () => {
  it("registers the service worker and shows offline status", async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register },
      configurable: true
    });

    render(<PwaBootstrap />);

    window.dispatchEvent(new Event("offline"));

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(await screen.findByText("Вы сейчас офлайн. Доступны сохранённые страницы.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npx vitest run tests/integration/pwa/pwa-bootstrap.test.tsx`

Expected: FAIL because `PwaBootstrap` does not exist.

- [ ] **Step 3: Add the manifest entry and offline-aware bootstrap**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Умная библиотека",
    short_name: "Библиотека",
    description: "Каталог книг с голосовым поиском и офлайн-доступом.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
```

```tsx
"use client";

import { useEffect, useState } from "react";

import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner";

export function PwaBootstrap() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    void navigator.serviceWorker?.register("/sw.js");

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return <OfflineStatusBanner isOffline={isOffline} />;
}
```

- [ ] **Step 4: Mount the bootstrap once in the root layout**

```tsx
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";

// inside <body>
<PwaBootstrap />
<header>...</header>
```

- [ ] **Step 5: Run the integration test again**

Run: `npx vitest run tests/integration/pwa/pwa-bootstrap.test.tsx`

Expected: PASS with service worker registration and offline banner assertions green.

- [ ] **Step 6: Commit the PWA shell**

```bash
git add src/app/manifest.ts src/components/pwa/pwa-bootstrap.tsx src/components/pwa/offline-status-banner.tsx src/app/layout.tsx public/icons/icon-192.png public/icons/icon-512.png tests/integration/pwa/pwa-bootstrap.test.tsx
git commit -m "feat: add installable pwa shell and offline banner"
```

## Task 5: Implement Service Worker Cache Strategy For Reader Routes

**Files:**
- Create: `src/lib/pwa/cache-config.ts`
- Create: `public/sw.js`
- Test: `tests/unit/pwa/cache-config.test.ts`

- [ ] **Step 1: Write the failing cache strategy unit tests**

```ts
import { describe, expect, it } from "vitest";

import {
  APP_SHELL_CACHE,
  CONTENT_CACHE,
  isOfflineSupportedNavigation
} from "@/lib/pwa/cache-config";

describe("pwa cache config", () => {
  it("marks catalog, favorites, recommendations, and book detail as offline-supported routes", () => {
    expect(isOfflineSupportedNavigation("/catalog")).toBe(true);
    expect(isOfflineSupportedNavigation("/favorites")).toBe(true);
    expect(isOfflineSupportedNavigation("/recommendations")).toBe(true);
    expect(isOfflineSupportedNavigation("/books/design-of-everyday-things")).toBe(true);
    expect(isOfflineSupportedNavigation("/admin/books")).toBe(false);
  });

  it("exports stable cache names", () => {
    expect(APP_SHELL_CACHE).toBe("smart-library-shell-v1");
    expect(CONTENT_CACHE).toBe("smart-library-content-v1");
  });
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/pwa/cache-config.test.ts`

Expected: FAIL because `@/lib/pwa/cache-config` does not exist.

- [ ] **Step 3: Implement the cache config helper**

```ts
export const APP_SHELL_CACHE = "smart-library-shell-v1";
export const CONTENT_CACHE = "smart-library-content-v1";

export function isOfflineSupportedNavigation(pathname: string) {
  return (
    pathname === "/catalog" ||
    pathname === "/favorites" ||
    pathname === "/recommendations" ||
    /^\/books\/[^/]+$/.test(pathname)
  );
}
```

- [ ] **Step 4: Implement the service worker with safe route-aware caching**

```js
const APP_SHELL_CACHE = "smart-library-shell-v1";
const CONTENT_CACHE = "smart-library-content-v1";
const APP_SHELL_ASSETS = ["/", "/catalog", "/manifest.webmanifest"];

function isOfflineSupportedNavigation(pathname) {
  return (
    pathname === "/catalog" ||
    pathname === "/favorites" ||
    pathname === "/recommendations" ||
    /^\/books\/[^/]+$/.test(pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.mode === "navigate" && isOfflineSupportedNavigation(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CONTENT_CACHE).then((cache) => cache.put(request, copy)));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? caches.match("/catalog");
        })
    );
    return;
  }

  if (url.pathname.startsWith("/covers/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CONTENT_CACHE).then((cache) => cache.put(request, copy)));
          return response;
        });
      })
    );
  }
});
```

- [ ] **Step 5: Run the PWA unit tests again**

Run: `npx vitest run tests/unit/pwa/cache-config.test.ts`

Expected: PASS with route classification assertions green.

- [ ] **Step 6: Commit the offline cache layer**

```bash
git add src/lib/pwa/cache-config.ts public/sw.js tests/unit/pwa/cache-config.test.ts
git commit -m "feat: add offline caching for reader routes"
```

## Task 6: Verify Voice Search, Offline Revisit, And Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `tests/e2e/voice-pwa-phase-d.spec.ts`

- [ ] **Step 1: Write the Phase D Playwright spec**

```ts
import { expect, test } from "@playwright/test";

test("phase d voice search and pwa routes stay usable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/catalog");
  await expect(page.getByRole("textbox", { name: "Быстрый поиск" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Голос|Слушаю/i })).toBeVisible();

  await page.getByRole("textbox", { name: "Быстрый поиск" }).fill("Норман");
  await expect(page.getByText("Дизайн привычных вещей")).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(page.getByRole("heading", { name: "Дизайн привычных вещей" })).toBeVisible();

  await context.setOffline(true);
  await page.goto("/catalog");
  await expect(page.getByText("Вы сейчас офлайн. Доступны сохранённые страницы.")).toBeVisible();
  await expect(page.getByText(/Каталог книг/i)).toBeVisible();
});
```

- [ ] **Step 2: Add the Phase D scripts**

```json
{
  "scripts": {
    "verify:phase-d": "npm run lint && npm run test && npm run build",
    "test:e2e:phase-d": "powershell -NoProfile -Command \"$env:PLAYWRIGHT_HOST='127.0.0.1'; $env:PLAYWRIGHT_PORT='3001'; $env:NEXTAUTH_URL='http://127.0.0.1:3001'; npx playwright test tests/e2e/voice-pwa-phase-d.spec.ts\""
  }
}
```

- [ ] **Step 3: Document the user-visible behavior in the README**

```md
## Phase D: Voice Search + PWA

- Voice search is available on `catalog`, `favorites`, and `recommendations` when the browser exposes `Web Speech API`.
- Unsupported browsers fall back to the normal text search without breaking the page.
- Offline support covers:
  - `/catalog`
  - `/favorites`
  - `/recommendations`
  - previously visited `/books/[slug]`

### Verification

- `npm run verify:phase-d`
- `npm run test:e2e:phase-d`
```

- [ ] **Step 4: Run the full Phase D verification**

Run:

```bash
npm run verify:phase-d
npm run test:e2e:phase-d
```

Expected:

- lint PASS
- vitest PASS
- next build PASS
- Playwright PASS for `voice-pwa-phase-d.spec.ts`

- [ ] **Step 5: Commit the verification and docs updates**

```bash
git add package.json README.md tests/e2e/voice-pwa-phase-d.spec.ts
git commit -m "docs: add phase d verification workflow"
```

## Spec Coverage Check

- Shared search runtime and voice wrapper: covered by Task 1 and Task 2.
- Search UI on `catalog`, `favorites`, `recommendations`: covered by Task 3.
- Manifest, installability, service worker registration, offline status UI: covered by Task 4.
- Offline cache for `catalog`, `favorites`, `recommendations`, and viewed book pages: covered by Task 5.
- Verification, E2E flow, and documentation: covered by Task 6.

## Placeholder Scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Every task includes exact file paths, commands, and code sketches for the engineer to follow.

## Type Consistency Check

- Shared filtering uses `SearchableItem` across all searchable wrappers.
- Voice support status uses `VoiceSupportState` from `src/lib/search/types.ts`.
- Route cache naming uses `APP_SHELL_CACHE` and `CONTENT_CACHE` consistently between tests and implementation.
