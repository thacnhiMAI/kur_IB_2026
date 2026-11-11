import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getBookDetailPageData } = vi.hoisted(() => ({
  getBookDetailPageData: vi.fn()
}));

const { decideARPreviewMode } = vi.hoisted(() => ({
  decideARPreviewMode: vi.fn()
}));
const attachBookScene = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const attachReaderScene = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/components/ar/webxr-scene", () => ({ attachBookScene }));
vi.mock("@/components/ar/webxr-reader-scene", () => ({ attachReaderScene }));

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

vi.mock("@/lib/catalog/service", () => ({
  getBookDetailPageData
}));

vi.mock("@/lib/ar/capabilities", () => ({
  decideARPreviewMode
}));

vi.mock("next/navigation", () => ({
  notFound
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="mock-three-canvas" />
}));

vi.mock("@react-three/drei", () => ({
  Billboard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Environment: () => <div data-testid="mock-three-environment" />,
  Float: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OrbitControls: () => <div data-testid="mock-three-controls" />,
  Image: ({ url }: { url: string }) => <div data-testid="mock-drei-image" data-url={url} />
}));

import ARBookPage from "@/app/ar/books/[slug]/page";
import { auth } from "@/auth";

const BOOK_DETAIL_FIXTURE = {
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
  isFeatured: true,
  year: 2013,
  readingMode: "internal",
  readHref: "/read/books/design-of-everyday-things",
  readLabel: "Читать",
  primaryContentId: "content-1"
};

const originalNavigatorXR = navigator.xr;
const originalWebGLRenderingContext = window.WebGLRenderingContext;

describe("ARBookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null as never);
    decideARPreviewMode.mockResolvedValue({
      mode: "2d-fallback",
      reason: "webgl-unsupported",
      renderer: "floating-card"
    });

    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: undefined
    });

    Object.defineProperty(window, "WebGLRenderingContext", {
      configurable: true,
      value: function WebGLRenderingContext() {}
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: originalNavigatorXR
    });

    Object.defineProperty(window, "WebGLRenderingContext", {
      configurable: true,
      value: originalWebGLRenderingContext
    });
  });

  it("renders a 2d preview shell with presenter content", async () => {
    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);

    render(
      await ARBookPage({
        params: Promise.resolve({ slug: "design-of-everyday-things" })
      })
    );

    await waitFor(() => {
      expect(decideARPreviewMode).toHaveBeenCalled();
    });
    expect(screen.getByRole("link", { name: "Читать PDF" })).toHaveAttribute(
      "href",
      "/read/books/design-of-everyday-things"
    );
    expect(screen.getByText("AR Preview")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Дизайн привычных вещей" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Проверить 2D" }));
    expect(screen.getByTestId("ar-preview-2d")).toBeInTheDocument();
  });

  it("switches to the reader-lite fallback shell when capabilities allow it", async () => {
    decideARPreviewMode.mockResolvedValue({
      mode: "3d-fallback",
      reason: "immersive-ar-unavailable",
      renderer: "book-solid"
    });

    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);

    render(
      await ARBookPage({
        params: Promise.resolve({ slug: "design-of-everyday-things" })
      })
    );

    await waitFor(() => {
      expect(decideARPreviewMode).toHaveBeenCalled();
    });
    expect(await screen.findByText("3D Book Preview")).toBeInTheDocument();
    expect(screen.getByTestId("ar-preview-3d")).toBeInTheDocument();
    expect(screen.getByTestId("ar-reader-lite")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Immersive AR is unavailable on this device. Opening the 3D Reader Lite preview instead."
      )
    ).toBeInTheDocument();
  });

  it("renders the webxr preview on supported devices", async () => {
    decideARPreviewMode.mockResolvedValue({
      mode: "webxr",
      reason: null,
      renderer: "book-solid"
    });

    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);

    render(
      await ARBookPage({
        params: Promise.resolve({ slug: "design-of-everyday-things" })
      })
    );

    await waitFor(() => {
      expect(decideARPreviewMode).toHaveBeenCalled();
    });
    expect(screen.getByText("AR Preview")).toBeInTheDocument();
    expect(screen.getByTestId("ar-preview-webxr")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start AR" })).toBeInTheDocument();
  });

  it("attaches the book and description to an immersive session", async () => {
    decideARPreviewMode.mockResolvedValue({ mode: "webxr", reason: null, renderer: "book-solid" });
    const session = new EventTarget();
    const end = vi.fn().mockResolvedValue(undefined);
    const requestSession = vi.fn().mockResolvedValue(Object.assign(session, { end }));
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: { requestSession, isSessionSupported: vi.fn().mockResolvedValue(true) }
    });
    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);
    const { unmount } = render(await ARBookPage({
      params: Promise.resolve({ slug: BOOK_DETAIL_FIXTURE.slug })
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Start AR" }));
    await waitFor(() => expect(attachBookScene).toHaveBeenCalledWith(session, expect.objectContaining({
      coverImage: BOOK_DETAIL_FIXTURE.coverImage,
      description: BOOK_DETAIL_FIXTURE.description
    })));
    expect(requestSession).toHaveBeenCalledWith("immersive-ar");
    await screen.findByText(/AR session is active/);
    unmount();
    expect(end).toHaveBeenCalledOnce();
  });

  it("opens the signed-in reader with optional hand tracking", async () => {
    decideARPreviewMode.mockResolvedValue({ mode: "webxr", reason: null, renderer: "book-solid" });
    vi.mocked(auth).mockResolvedValue({ user: { id: "reader" } } as never);
    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);
    const session = Object.assign(new EventTarget(), { end: vi.fn().mockResolvedValue(undefined) });
    const requestSession = vi.fn().mockResolvedValue(session);
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: { requestSession, isSessionSupported: vi.fn().mockResolvedValue(true) }
    });
    render(await ARBookPage({ params: Promise.resolve({ slug: BOOK_DETAIL_FIXTURE.slug }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Читать PDF в AR" }));
    await waitFor(() => expect(attachReaderScene).toHaveBeenCalledWith(session, "/api/reading/content/content-1"));
    expect(requestSession).toHaveBeenCalledWith("immersive-ar", { optionalFeatures: ["hand-tracking"] });
  });

  it("falls back to the 3d preview when webxr session startup fails", async () => {
    decideARPreviewMode.mockResolvedValue({
      mode: "webxr",
      reason: null,
      renderer: "book-solid"
    });

    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: {
        isSessionSupported: vi.fn().mockResolvedValue(true),
        requestSession: vi.fn().mockRejectedValue(new Error("camera denied"))
      }
    });

    getBookDetailPageData.mockResolvedValue(BOOK_DETAIL_FIXTURE);

    render(
      await ARBookPage({
        params: Promise.resolve({ slug: "design-of-everyday-things" })
      })
    );

    const startButton = await screen.findByRole("button", { name: "Start AR" });

    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("ar-preview-3d")).toBeInTheDocument();
    });
    expect(screen.getByText("Fallback reason: camera-denied")).toBeInTheDocument();
  });
});
