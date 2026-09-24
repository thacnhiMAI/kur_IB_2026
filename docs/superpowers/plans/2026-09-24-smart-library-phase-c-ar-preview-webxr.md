# Smart Library Phase C AR Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Phase C AR preview flow for book detail pages with QR entry, `WebXR` when available, `3D` fallback when AR is unavailable, and `2D` fallback when 3D cannot run.

**Architecture:** Add a dedicated `/ar/books/[slug]` route that consumes a compact `ARBookPayload`, detects device capabilities on the client, and renders one of three modes: `webxr`, `3d-fallback`, or `2d-fallback`. Keep all data loading on the server side, keep rendering concerns inside focused AR components, and integrate QR entry from the existing book detail page without making the detail page itself heavy.

**Tech Stack:** `Next.js 15 App Router`, `TypeScript`, `Prisma`, `Tailwind CSS`, `Vitest`, `Playwright`, `three`, `@react-three/fiber`, `@react-three/drei`, `qrcode.react`

---

## File Structure

### New files

- `src/lib/ar/types.ts`
  - Shared AR domain types such as `ARBookPayload`, `ARPreviewMode`, and fallback reason types.
- `src/lib/ar/payload.ts`
  - Server-safe mapping helpers that convert catalog detail data into `ARBookPayload`.
- `src/lib/ar/capabilities.ts`
  - Client-side capability detection and mode selection logic.
- `src/lib/ar/urls.ts`
  - Helpers for building route URLs and absolute QR URLs for AR routes.
- `src/components/books/ar-entry.tsx`
  - Lightweight block embedded in the book detail page with CTA, QR, and compatibility copy.
- `src/components/ar/ar-presenter.tsx`
  - Shared text/status presenter shown across `WebXR`, `3D`, and `2D` modes.
- `src/components/ar/ar-preview-2d.tsx`
  - Enhanced 2D fallback preview.
- `src/components/ar/floating-card-renderer.tsx`
  - Lightweight visual renderer for weaker devices.
- `src/components/ar/book-solid-renderer.tsx`
  - Book-like 3D object renderer using cover texture and dominant color.
- `src/components/ar/ar-preview-3d.tsx`
  - Canvas-based 3D preview wrapper that chooses the right 3D renderer.
- `src/components/ar/ar-preview-webxr.tsx`
  - `WebXR` start surface with camera/session handling and fallback escalation.
- `src/components/ar/ar-client-shell.tsx`
  - Client wrapper that performs capability detection and renders the correct mode.
- `src/app/ar/books/[slug]/page.tsx`
  - Server route for AR preview using existing catalog data.
- `src/types/webxr.d.ts`
  - Minimal `navigator.xr` type declarations to keep TypeScript happy.
- `tests/unit/ar/payload.test.ts`
  - Unit tests for payload building and fallbacks.
- `tests/unit/ar/capabilities.test.ts`
  - Unit tests for mode detection and fallback reasons.
- `tests/integration/ar/ar-book-page.test.tsx`
  - Integration tests for the AR route and mode shell.
- `tests/e2e/ar-preview-phase-c.spec.ts`
  - E2E flow from book detail page into AR route.

### Modified files

- `package.json`
  - Add AR dependencies and verification scripts for Phase C.
- `src/components/books/book-detail.tsx`
  - Mount the `AR entry` block.
- `src/lib/books/presenters.ts`
  - Reuse catalog detail data to build AR-friendly payload inputs.
- `README.md`
  - Document the AR route, QR behavior, and verification commands.
- `tests/integration/catalog/book-detail-page.test.tsx`
  - Assert AR entry presence on the book detail page.

## Task 1: Add AR dependencies and shared data contract

**Files:**
- Create: `src/lib/ar/types.ts`
- Create: `src/lib/ar/payload.ts`
- Create: `tests/unit/ar/payload.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing payload tests**

```ts
import { describe, expect, it } from "vitest";

import { buildARBookPayload } from "@/lib/ar/payload";

describe("buildARBookPayload", () => {
  it("prefers cached cover metadata and keeps the AR payload compact", () => {
    const payload = buildARBookPayload({
      id: "book-1",
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: "Исправленное издание",
      description: "Классическая книга о проектировании.",
      coverImage: "/covers/design.jpg",
      dominantColor: "#112233",
      authors: ["Дон Норман"]
    });

    expect(payload).toEqual({
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: "Исправленное издание",
      description: "Классическая книга о проектировании.",
      coverImage: "/covers/design.jpg",
      dominantColor: "#112233",
      authors: ["Дон Норман"]
    });
  });

  it("falls back to the shared project cover when no book cover exists", () => {
    const payload = buildARBookPayload({
      id: "book-2",
      slug: "missing-cover",
      title: "Без обложки",
      subtitle: null,
      description: "Тестовая книга без обложки.",
      coverImage: null,
      dominantColor: null,
      authors: ["Unknown Author"]
    });

    expect(payload.coverImage).toBe("/covers/fallback-book.jpg");
    expect(payload.dominantColor).toBe("#0F172A");
  });
});
```

- [ ] **Step 2: Run the payload tests to verify they fail**

Run:

```bash
npx vitest run tests/unit/ar/payload.test.ts
```

Expected: FAIL with module-not-found errors for `@/lib/ar/payload`.

- [ ] **Step 3: Add AR dependencies and create the shared types**

```json
{
  "dependencies": {
    "@react-three/drei": "^9.120.4",
    "@react-three/fiber": "^8.17.10",
    "qrcode.react": "^4.2.0",
    "three": "^0.171.0"
  },
  "scripts": {
    "test:e2e:phase-c": "powershell -NoProfile -Command \"$env:PLAYWRIGHT_HOST='127.0.0.1'; $env:PLAYWRIGHT_PORT='3001'; $env:NEXTAUTH_URL='http://127.0.0.1:3001'; npx playwright test tests/e2e/ar-preview-phase-c.spec.ts\"",
    "verify:phase-c": "npm run lint && npm run test && npm run build"
  }
}
```

```ts
// src/lib/ar/types.ts
export type ARPreviewMode = "webxr" | "3d-fallback" | "2d-fallback";

export type ARFallbackReason =
  | "xr-unsupported"
  | "immersive-ar-unavailable"
  | "webgl-unsupported"
  | "renderer-init-failed"
  | "camera-denied"
  | "desktop-device";

export type ARBookPayload = {
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  coverImage?: string | null;
  dominantColor?: string | null;
};

export const DEFAULT_AR_COVER = "/covers/fallback-book.jpg";
export const DEFAULT_AR_COLOR = "#0F172A";
```

```ts
// src/lib/ar/payload.ts
import {
  DEFAULT_AR_COLOR,
  DEFAULT_AR_COVER,
  type ARBookPayload
} from "@/lib/ar/types";

type ARPayloadInput = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  coverImage: string | null;
  dominantColor: string | null;
  authors: string[];
};

export function buildARBookPayload(input: ARPayloadInput): ARBookPayload {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    coverImage: input.coverImage ?? DEFAULT_AR_COVER,
    dominantColor: input.dominantColor ?? DEFAULT_AR_COLOR,
    authors: input.authors
  };
}
```

- [ ] **Step 4: Re-run the payload tests to verify they pass**

Run:

```bash
npx vitest run tests/unit/ar/payload.test.ts
```

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit the contract scaffold**

```bash
git add package.json src/lib/ar/types.ts src/lib/ar/payload.ts tests/unit/ar/payload.test.ts
git commit -m "feat: add ar payload contract"
```

## Task 2: Implement capability detection and mode selection

**Files:**
- Create: `src/lib/ar/capabilities.ts`
- Create: `src/types/webxr.d.ts`
- Create: `tests/unit/ar/capabilities.test.ts`

- [ ] **Step 1: Write the failing capability tests**

```ts
import { describe, expect, it } from "vitest";

import { decideARPreviewMode } from "@/lib/ar/capabilities";

describe("decideARPreviewMode", () => {
  it("prefers webxr when immersive-ar is supported", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: false,
      hasNavigatorXR: true,
      canUseImmersiveAR: true,
      hasWebGL: true,
      prefersReducedMotion: false
    });

    expect(result).toEqual({
      mode: "webxr",
      reason: null,
      renderer: "book-solid"
    });
  });

  it("falls back to 3d viewer when immersive-ar is unavailable but webgl exists", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: false,
      hasNavigatorXR: true,
      canUseImmersiveAR: false,
      hasWebGL: true,
      prefersReducedMotion: false
    });

    expect(result.mode).toBe("3d-fallback");
    expect(result.reason).toBe("immersive-ar-unavailable");
  });

  it("falls back to 2d preview when webgl is unavailable", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: true,
      hasNavigatorXR: false,
      canUseImmersiveAR: false,
      hasWebGL: false,
      prefersReducedMotion: true
    });

    expect(result).toEqual({
      mode: "2d-fallback",
      reason: "webgl-unsupported",
      renderer: "floating-card"
    });
  });
});
```

- [ ] **Step 2: Run the capability tests to verify they fail**

Run:

```bash
npx vitest run tests/unit/ar/capabilities.test.ts
```

Expected: FAIL because `@/lib/ar/capabilities` does not exist.

- [ ] **Step 3: Implement the capability module and WebXR typing**

```ts
// src/types/webxr.d.ts
declare global {
  interface XRSystem {
    isSessionSupported(mode: "immersive-ar"): Promise<boolean>;
    requestSession(mode: "immersive-ar", options?: object): Promise<unknown>;
  }

  interface Navigator {
    xr?: XRSystem;
  }
}

export {};
```

```ts
// src/lib/ar/capabilities.ts
import type { ARFallbackReason, ARPreviewMode } from "@/lib/ar/types";

export type ARRendererVariant = "book-solid" | "floating-card";

export type ARCapabilitySnapshot = {
  isDesktopLike: boolean;
  hasNavigatorXR: boolean;
  canUseImmersiveAR: boolean;
  hasWebGL: boolean;
  prefersReducedMotion: boolean;
};

export type ARCapabilityDecision = {
  mode: ARPreviewMode;
  reason: ARFallbackReason | null;
  renderer: ARRendererVariant;
};

export async function decideARPreviewMode(
  snapshot: ARCapabilitySnapshot
): Promise<ARCapabilityDecision> {
  if (snapshot.hasNavigatorXR && snapshot.canUseImmersiveAR && !snapshot.isDesktopLike) {
    return {
      mode: "webxr",
      reason: null,
      renderer: snapshot.prefersReducedMotion ? "floating-card" : "book-solid"
    };
  }

  if (snapshot.hasWebGL) {
    return {
      mode: "3d-fallback",
      reason: snapshot.hasNavigatorXR ? "immersive-ar-unavailable" : "xr-unsupported",
      renderer: snapshot.prefersReducedMotion ? "floating-card" : "book-solid"
    };
  }

  return {
    mode: "2d-fallback",
    reason: "webgl-unsupported",
    renderer: "floating-card"
  };
}
```

- [ ] **Step 4: Re-run the capability tests to verify they pass**

Run:

```bash
npx vitest run tests/unit/ar/capabilities.test.ts
```

Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit the capability layer**

```bash
git add src/lib/ar/capabilities.ts src/types/webxr.d.ts tests/unit/ar/capabilities.test.ts
git commit -m "feat: add ar capability detection"
```

## Task 3: Build the AR route with 2D fallback shell first

**Files:**
- Create: `src/components/ar/ar-presenter.tsx`
- Create: `src/components/ar/ar-preview-2d.tsx`
- Create: `src/components/ar/ar-client-shell.tsx`
- Create: `src/app/ar/books/[slug]/page.tsx`
- Create: `tests/integration/ar/ar-book-page.test.tsx`
- Modify: `src/lib/books/presenters.ts`

- [ ] **Step 1: Write the failing integration tests for the AR route**

```ts
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBookDetailPageData } = vi.hoisted(() => ({
  getBookDetailPageData: vi.fn()
}));

vi.mock("@/lib/catalog/service", () => ({
  getBookDetailPageData
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

import ARBookPage from "@/app/ar/books/[slug]/page";

describe("ARBookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a 2d preview shell with presenter content", async () => {
    getBookDetailPageData.mockResolvedValue({
      id: "book-1",
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: "Исправленное издание",
      description: "Классическая книга о проектировании.",
      coverImage: "/covers/design.jpg",
      dominantColor: "#112233",
      blurDataUrl: null,
      authors: ["Дон Норман"],
      genres: ["Дизайн"],
      publisher: "MIT Press",
      edition: "Revised",
      isbn13: "9780441172719",
      language: "ru",
      pages: 368,
      ratingAverage: 4.5,
      ratingsCount: 1200,
      isFeatured: true
    });

    render(await ARBookPage({ params: Promise.resolve({ slug: "design-of-everyday-things" }) }));

    expect(screen.getByText("AR Preview")).toBeInTheDocument();
    expect(screen.getByText("Дизайн привычных вещей")).toBeInTheDocument();
    expect(screen.getByTestId("ar-preview-2d")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the AR route integration test to verify it fails**

Run:

```bash
npx vitest run tests/integration/ar/ar-book-page.test.tsx
```

Expected: FAIL because the AR route and components do not exist.

- [ ] **Step 3: Implement the AR route, shared presenter, and initial 2D shell**

```ts
// src/lib/books/presenters.ts
import { buildARBookPayload } from "@/lib/ar/payload";
import type { CatalogBookDetail } from "@/lib/catalog/queries";

export function toARBookPayload(book: CatalogBookDetail) {
  return buildARBookPayload({
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    coverImage: book.coverImage,
    dominantColor: book.dominantColor,
    authors: book.authors
  });
}
```

```tsx
// src/components/ar/ar-presenter.tsx
import React from "react";

import type { ARBookPayload, ARFallbackReason, ARPreviewMode } from "@/lib/ar/types";

export function ARPresenter({
  book,
  mode,
  reason
}: {
  book: ARBookPayload;
  mode: ARPreviewMode;
  reason: ARFallbackReason | null;
}) {
  const label =
    mode === "webxr" ? "AR Preview" : mode === "3d-fallback" ? "3D Preview" : "2D Preview";

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{label}</p>
      <h1 className="text-3xl font-semibold text-white">{book.title}</h1>
      <p className="text-sm text-slate-400">{book.authors.join(", ")}</p>
      <p className="max-w-2xl text-sm leading-7 text-slate-300">{book.description}</p>
      {reason ? <p className="text-sm text-amber-200">Fallback reason: {reason}</p> : null}
    </div>
  );
}
```

```tsx
// src/components/ar/ar-preview-2d.tsx
import React from "react";
import Image from "next/image";

import type { ARBookPayload } from "@/lib/ar/types";

export function ARPreview2D({ book }: { book: ARBookPayload }) {
  return (
    <div
      data-testid="ar-preview-2d"
      className="grid gap-6 rounded-[32px] border border-white/10 bg-slate-950/80 p-8 md:grid-cols-[320px_minmax(0,1fr)]"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${book.dominantColor ?? "#0F172A"}66, transparent 38%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96))`
      }}
    >
      <Image
        src={book.coverImage ?? "/covers/fallback-book.jpg"}
        alt={book.title}
        width={720}
        height={1080}
        className="w-full rounded-[24px] object-cover shadow-2xl shadow-slate-950/50"
      />
      <div className="space-y-4">
        <p className="text-sm text-slate-400">AR is not available on this device, so a readable preview is shown instead.</p>
      </div>
    </div>
  );
}
```

```tsx
// src/components/ar/ar-client-shell.tsx
"use client";

import React from "react";

import { ARPresenter } from "@/components/ar/ar-presenter";
import { ARPreview2D } from "@/components/ar/ar-preview-2d";
import type { ARBookPayload } from "@/lib/ar/types";

export function ARClientShell({ book }: { book: ARBookPayload }) {
  return (
    <section className="space-y-6">
      <ARPresenter book={book} mode="2d-fallback" reason={null} />
      <ARPreview2D book={book} />
    </section>
  );
}
```

```tsx
// src/app/ar/books/[slug]/page.tsx
import React from "react";
import { notFound } from "next/navigation";

import { ARClientShell } from "@/components/ar/ar-client-shell";
import { getBookDetailPageData } from "@/lib/catalog/service";
import { toARBookPayload } from "@/lib/books/presenters";

export const revalidate = 300;

export default async function ARBookPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);

  if (!book) {
    notFound();
  }

  return <ARClientShell book={toARBookPayload(book)} />;
}
```

- [ ] **Step 4: Re-run the AR route integration test to verify it passes**

Run:

```bash
npx vitest run tests/integration/ar/ar-book-page.test.tsx
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the AR route shell**

```bash
git add src/lib/books/presenters.ts src/components/ar/ar-presenter.tsx src/components/ar/ar-preview-2d.tsx src/components/ar/ar-client-shell.tsx src/app/ar/books/[slug]/page.tsx tests/integration/ar/ar-book-page.test.tsx
git commit -m "feat: add ar route shell"
```

## Task 4: Add QR entry to the book detail page

**Files:**
- Create: `src/lib/ar/urls.ts`
- Create: `src/components/books/ar-entry.tsx`
- Modify: `src/components/books/book-detail.tsx`
- Modify: `tests/integration/catalog/book-detail-page.test.tsx`

- [ ] **Step 1: Extend the book detail tests with AR entry expectations**

```ts
expect(screen.getByRole("heading", { name: "AR Preview" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Открыть AR" })).toHaveAttribute(
  "href",
  "/ar/books/design-of-everyday-things"
);
expect(screen.getByTestId("book-ar-qr")).toBeInTheDocument();
```

- [ ] **Step 2: Run the book detail integration test to verify it fails**

Run:

```bash
npx vitest run tests/integration/catalog/book-detail-page.test.tsx
```

Expected: FAIL because the AR entry is not rendered yet.

- [ ] **Step 3: Implement AR URLs and mount the QR entry block**

```ts
// src/lib/ar/urls.ts
export function getARRoutePath(slug: string) {
  return `/ar/books/${slug}`;
}

export function getARAbsoluteUrl(slug: string, baseUrl?: string) {
  const origin = baseUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(getARRoutePath(slug), origin).toString();
}
```

```tsx
// src/components/books/ar-entry.tsx
import React from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { getARAbsoluteUrl, getARRoutePath } from "@/lib/ar/urls";

export function AREntry({
  slug,
  title
}: {
  slug: string;
  title: string;
}) {
  const routePath = getARRoutePath(slug);
  const absoluteUrl = getARAbsoluteUrl(slug);

  return (
    <div className="rounded-[28px] border border-cyan-400/20 bg-slate-950/80 p-6">
      <h2 className="text-xl font-semibold text-white">AR Preview</h2>
      <p className="mt-2 text-sm text-slate-400">
        Откройте AR на телефоне или используйте fallback preview на текущем устройстве.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <Link
          href={routePath}
          className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950"
        >
          Открыть AR
        </Link>
        <div data-testid="book-ar-qr" className="rounded-2xl bg-white p-3">
          <QRCodeSVG value={absoluteUrl} title={`AR QR for ${title}`} size={112} />
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/components/books/book-detail.tsx
import { AREntry } from "@/components/books/ar-entry";

// inside the component tree, place the block between metadata and actions
<AREntry slug={slug} title={title} />
```

- [ ] **Step 4: Re-run the detail page integration test to verify it passes**

Run:

```bash
npx vitest run tests/integration/catalog/book-detail-page.test.tsx
```

Expected: PASS and the AR entry assertions succeed.

- [ ] **Step 5: Commit the AR entry integration**

```bash
git add src/lib/ar/urls.ts src/components/books/ar-entry.tsx src/components/books/book-detail.tsx tests/integration/catalog/book-detail-page.test.tsx
git commit -m "feat: add ar qr entry to book detail"
```

## Task 5: Add 3D fallback rendering and real capability-based mode switching

**Files:**
- Create: `src/components/ar/floating-card-renderer.tsx`
- Create: `src/components/ar/book-solid-renderer.tsx`
- Create: `src/components/ar/ar-preview-3d.tsx`
- Modify: `src/components/ar/ar-client-shell.tsx`
- Modify: `tests/integration/ar/ar-book-page.test.tsx`

- [ ] **Step 1: Expand the AR route tests for capability-based 3D fallback**

```ts
vi.mock("@/lib/ar/capabilities", () => ({
  decideARPreviewMode: vi.fn(async () => ({
    mode: "3d-fallback",
    reason: "immersive-ar-unavailable",
    renderer: "book-solid"
  }))
}));

expect(screen.getByText("3D Preview")).toBeInTheDocument();
expect(screen.getByTestId("ar-preview-3d")).toBeInTheDocument();
```

- [ ] **Step 2: Run the AR route integration test to verify it fails**

Run:

```bash
npx vitest run tests/integration/ar/ar-book-page.test.tsx
```

Expected: FAIL because the 3D preview path is not implemented.

- [ ] **Step 3: Implement the 3D preview components and connect capability selection**

```tsx
// src/components/ar/floating-card-renderer.tsx
import React from "react";
import { Billboard, Image as DreiImage } from "@react-three/drei";

export function FloatingCardRenderer({ coverImage }: { coverImage: string }) {
  return (
    <Billboard>
      <DreiImage url={coverImage} scale={[1.8, 2.6, 1]} />
    </Billboard>
  );
}
```

```tsx
// src/components/ar/book-solid-renderer.tsx
import React from "react";

export function BookSolidRenderer({ color = "#0F172A" }: { color?: string }) {
  return (
    <mesh rotation={[0.1, 0.45, -0.05]}>
      <boxGeometry args={[1.5, 2.2, 0.24]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
```

```tsx
// src/components/ar/ar-preview-3d.tsx
"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";

import { BookSolidRenderer } from "@/components/ar/book-solid-renderer";
import { FloatingCardRenderer } from "@/components/ar/floating-card-renderer";
import type { ARBookPayload } from "@/lib/ar/types";
import type { ARRendererVariant } from "@/lib/ar/capabilities";

export function ARPreview3D({
  book,
  renderer
}: {
  book: ARBookPayload;
  renderer: ARRendererVariant;
}) {
  return (
    <div data-testid="ar-preview-3d" className="h-[520px] rounded-[32px] border border-white/10 bg-slate-950/80">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <Float speed={1.3} rotationIntensity={0.15}>
          {renderer === "book-solid" ? (
            <BookSolidRenderer color={book.dominantColor ?? "#0F172A"} />
          ) : (
            <FloatingCardRenderer coverImage={book.coverImage ?? "/covers/fallback-book.jpg"} />
          )}
        </Float>
        <Environment preset="city" />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
```

```tsx
// src/components/ar/ar-client-shell.tsx
"use client";

import React from "react";

import { ARPresenter } from "@/components/ar/ar-presenter";
import { ARPreview2D } from "@/components/ar/ar-preview-2d";
import { ARPreview3D } from "@/components/ar/ar-preview-3d";
import { decideARPreviewMode } from "@/lib/ar/capabilities";
import type { ARBookPayload } from "@/lib/ar/types";

export function ARClientShell({ book }: { book: ARBookPayload }) {
  const [decision, setDecision] = React.useState({
    mode: "2d-fallback",
    reason: null,
    renderer: "floating-card"
  });

  React.useEffect(() => {
    async function loadDecision() {
      const canUseImmersiveAR = Boolean(
        navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar"))
      );

      const nextDecision = await decideARPreviewMode({
        isDesktopLike: window.matchMedia("(pointer:fine)").matches,
        hasNavigatorXR: Boolean(navigator.xr),
        canUseImmersiveAR,
        hasWebGL: Boolean(window.WebGLRenderingContext),
        prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      });

      setDecision(nextDecision);
    }

    void loadDecision();
  }, []);

  return (
    <section className="space-y-6">
      <ARPresenter book={book} mode={decision.mode} reason={decision.reason} />
      {decision.mode === "2d-fallback" ? (
        <ARPreview2D book={book} />
      ) : (
        <ARPreview3D book={book} renderer={decision.renderer} />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Re-run the AR route integration test to verify it passes**

Run:

```bash
npx vitest run tests/integration/ar/ar-book-page.test.tsx
```

Expected: PASS with 3D fallback coverage.

- [ ] **Step 5: Commit the 3D fallback viewer**

```bash
git add src/components/ar/floating-card-renderer.tsx src/components/ar/book-solid-renderer.tsx src/components/ar/ar-preview-3d.tsx src/components/ar/ar-client-shell.tsx tests/integration/ar/ar-book-page.test.tsx
git commit -m "feat: add ar 3d fallback viewer"
```

## Task 6: Add WebXR session handling and graceful escalation

**Files:**
- Create: `src/components/ar/ar-preview-webxr.tsx`
- Modify: `src/components/ar/ar-client-shell.tsx`
- Modify: `tests/unit/ar/capabilities.test.ts`
- Modify: `tests/integration/ar/ar-book-page.test.tsx`

- [ ] **Step 1: Add failing tests for the WebXR-preferred path**

```ts
it("prefers webxr on supported mobile-like devices", async () => {
  const result = await decideARPreviewMode({
    isDesktopLike: false,
    hasNavigatorXR: true,
    canUseImmersiveAR: true,
    hasWebGL: true,
    prefersReducedMotion: false
  });

  expect(result.mode).toBe("webxr");
});
```

```ts
expect(screen.getByTestId("ar-preview-webxr")).toBeInTheDocument();
expect(screen.getByText("AR Preview")).toBeInTheDocument();
```

- [ ] **Step 2: Run the AR unit and integration tests to verify they fail**

Run:

```bash
npx vitest run tests/unit/ar/capabilities.test.ts tests/integration/ar/ar-book-page.test.tsx
```

Expected: FAIL because no WebXR preview component exists yet.

- [ ] **Step 3: Implement the WebXR preview surface with fallback escalation**

```tsx
// src/components/ar/ar-preview-webxr.tsx
"use client";

import React from "react";

import type { ARBookPayload } from "@/lib/ar/types";

export function ARPreviewWebXR({
  book,
  onFallback
}: {
  book: ARBookPayload;
  onFallback: (reason: "camera-denied" | "renderer-init-failed") => void;
}) {
  const [status, setStatus] = React.useState("Нажмите, чтобы запустить AR-сеанс.");

  async function handleStart() {
    try {
      if (!navigator.xr) {
        onFallback("renderer-init-failed");
        return;
      }

      const supported = await navigator.xr.isSessionSupported("immersive-ar");
      if (!supported) {
        onFallback("renderer-init-failed");
        return;
      }

      setStatus(`AR-сеанс готов для книги: ${book.title}`);
    } catch {
      onFallback("camera-denied");
    }
  }

  return (
    <div data-testid="ar-preview-webxr" className="rounded-[32px] border border-emerald-400/20 bg-slate-950/80 p-8">
      <p className="text-sm text-slate-300">{status}</p>
      <button
        type="button"
        onClick={handleStart}
        className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 font-medium text-slate-950"
      >
        Запустить AR
      </button>
    </div>
  );
}
```

```tsx
// inside src/components/ar/ar-client-shell.tsx
import { ARPreviewWebXR } from "@/components/ar/ar-preview-webxr";

// add fallback escalation state and rendering
const [decision, setDecision] = React.useState({
  mode: "2d-fallback",
  reason: null,
  renderer: "floating-card"
});

function handleWebXRFallback(reason: "camera-denied" | "renderer-init-failed") {
  setDecision((current) => ({
    mode: current.mode === "webxr" ? "3d-fallback" : "2d-fallback",
    reason,
    renderer: current.renderer
  }));
}

{decision.mode === "webxr" ? (
  <ARPreviewWebXR book={book} onFallback={handleWebXRFallback} />
) : decision.mode === "2d-fallback" ? (
  <ARPreview2D book={book} />
) : (
  <ARPreview3D book={book} renderer={decision.renderer} />
)}
```

- [ ] **Step 4: Re-run the AR unit and integration tests to verify they pass**

Run:

```bash
npx vitest run tests/unit/ar/capabilities.test.ts tests/integration/ar/ar-book-page.test.tsx
```

Expected: PASS with WebXR path covered.

- [ ] **Step 5: Commit the WebXR mode**

```bash
git add src/components/ar/ar-preview-webxr.tsx src/components/ar/ar-client-shell.tsx tests/unit/ar/capabilities.test.ts tests/integration/ar/ar-book-page.test.tsx
git commit -m "feat: add webxr ar preview path"
```

## Task 7: Add end-to-end verification and documentation

**Files:**
- Create: `tests/e2e/ar-preview-phase-c.spec.ts`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Write the failing E2E spec**

```ts
import { expect, test } from "@playwright/test";

test("book detail opens ar route and shows a fallback-safe preview", async ({ page }) => {
  await page.goto("/books/design-of-everyday-things");

  await expect(page.getByRole("heading", { name: "AR Preview" })).toBeVisible();
  await expect(page.getByTestId("book-ar-qr")).toBeVisible();

  await page.getByRole("link", { name: "Открыть AR" }).click();

  await expect(page).toHaveURL(/\/ar\/books\/design-of-everyday-things/);
  await expect(
    page.getByText(/AR Preview|3D Preview|2D Preview/)
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E spec to verify it fails**

Run:

```bash
npx playwright test tests/e2e/ar-preview-phase-c.spec.ts --reporter=line
```

Expected: FAIL until the AR entry and route are fully implemented.

- [ ] **Step 3: Add package scripts and document the Phase C flow**

```md
## Phase C AR Preview

- Open any book detail page and use the `AR Preview` block.
- Scan the QR code on desktop to continue on a mobile device.
- The route `/ar/books/[slug]` automatically selects:
  - `WebXR AR` when `immersive-ar` is available
  - `3D Preview` when WebXR is unavailable but 3D rendering works
  - `2D Preview` when the device cannot render 3D safely

### Verification

- `npm run verify:phase-c`
- `npm run test:e2e:phase-c`
```

- [ ] **Step 4: Run full Phase C verification**

Run:

```bash
npm run verify:phase-c
npm run test:e2e:phase-c
```

Expected:

- `lint` PASS
- `vitest` PASS
- `build` PASS
- Phase C Playwright spec PASS

- [ ] **Step 5: Commit the verification layer**

```bash
git add package.json README.md tests/e2e/ar-preview-phase-c.spec.ts
git commit -m "test: add phase c ar verification"
```

## Spec Coverage Check

- `AR entry` on book detail page: covered by Task 4.
- `QR-code` and route handoff: covered by Task 4 and Task 7.
- `/ar/books/[slug]` route: covered by Task 3.
- Capability detection: covered by Task 2 and Task 5.
- `WebXR -> 3D -> 2D` fallback ladder: covered by Task 5 and Task 6.
- Reuse of existing cover assets and dominant color: covered by Task 1 and Task 3.
- Error-resistant fallback behavior: covered by Task 5 and Task 6.
- Unit, integration, and E2E verification: covered by Tasks 1, 2, 3, 4, 6, and 7.

## Self-Review Notes

- Placeholder scan complete: no `TODO`, `TBD`, or deferred “implement later” instructions remain.
- Type consistency checked:
  - `ARBookPayload`, `ARPreviewMode`, and fallback reasons are defined once in Task 1 and reused consistently later.
  - `book-solid` and `floating-card` renderer variants are introduced in Task 2 and used consistently in Tasks 5 and 6.
- Scope check complete:
  - plan stays inside Phase C and does not pull in unrelated `Voice`, `PWA`, or deploy work.
