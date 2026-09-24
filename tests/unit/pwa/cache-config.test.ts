import { describe, expect, it } from "vitest";

import {
  APP_SHELL_CACHE,
  CONTENT_CACHE,
  isOfflineSupportedNavigation,
  shouldCacheAppAsset,
  shouldCacheCoverAsset,
  shouldCacheNavigation
} from "@/lib/pwa/cache-config";

describe("pwa cache config", () => {
  it("marks catalog, favorites, recommendations, and book detail as offline-supported routes", () => {
    expect(isOfflineSupportedNavigation("/catalog")).toBe(true);
    expect(isOfflineSupportedNavigation("/favorites")).toBe(true);
    expect(isOfflineSupportedNavigation("/recommendations")).toBe(true);
    expect(
      isOfflineSupportedNavigation("/books/design-of-everyday-things")
    ).toBe(true);
    expect(isOfflineSupportedNavigation("/admin/books")).toBe(false);
  });

  it("keeps auth, api, and nested book routes out of offline navigation support", () => {
    expect(isOfflineSupportedNavigation("/auth/sign-in")).toBe(false);
    expect(isOfflineSupportedNavigation("/api/recommendations")).toBe(false);
    expect(
      isOfflineSupportedNavigation("/books/design-of-everyday-things/reviews")
    ).toBe(false);
  });

  it("exports stable cache names", () => {
    expect(APP_SHELL_CACHE).toBe("smart-library-shell-v1");
    expect(CONTENT_CACHE).toBe("smart-library-content-v1");
  });

  it("caches only safe offline navigation requests", () => {
    expect(
      shouldCacheNavigation({ method: "GET", pathname: "/catalog" })
    ).toBe(true);
    expect(
      shouldCacheNavigation({ method: "POST", pathname: "/catalog" })
    ).toBe(false);
    expect(
      shouldCacheNavigation({ method: "GET", pathname: "/auth/sign-in" })
    ).toBe(false);
  });

  it("limits runtime asset caching to GET cover requests", () => {
    expect(
      shouldCacheCoverAsset({ method: "GET", pathname: "/covers/test-book.jpg" })
    ).toBe(true);
    expect(
      shouldCacheCoverAsset({ method: "POST", pathname: "/covers/test-book.jpg" })
    ).toBe(false);
    expect(
      shouldCacheCoverAsset({ method: "GET", pathname: "/admin/covers/test-book.jpg" })
    ).toBe(false);
  });

  it("caches only safe Next app shell assets", () => {
    expect(
      shouldCacheAppAsset({
        method: "GET",
        pathname: "/_next/static/chunks/app/layout.js"
      })
    ).toBe(true);
    expect(
      shouldCacheAppAsset({
        method: "POST",
        pathname: "/_next/static/chunks/app/layout.js"
      })
    ).toBe(false);
    expect(
      shouldCacheAppAsset({
        method: "GET",
        pathname: "/auth/_next/static/chunks/app/layout.js"
      })
    ).toBe(false);
  });
});
