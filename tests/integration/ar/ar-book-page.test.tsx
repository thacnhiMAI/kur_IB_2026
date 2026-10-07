import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getBookDetailPageData } = vi.hoisted(() => ({
  getBookDetailPageData: vi.fn()
}));

const { decideARPreviewMode } = vi.hoisted(() => ({
  decideARPreviewMode: vi.fn()
}));

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

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
    expect(screen.getByRole("link", { name: "Читать" })).toHaveAttribute(
      "href",
      "/read/books/design-of-everyday-things"
    );
    expect(screen.getByText("AR Preview")).toBeInTheDocument();
    expect(screen.getAllByText("Дизайн привычных вещей")).toHaveLength(2);
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
    expect(await screen.findByText("3D Reader Lite")).toBeInTheDocument();
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
