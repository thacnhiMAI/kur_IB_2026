import { describe, expect, it } from "vitest";

import { getBookCoverAsset, resolveBookImageSrc } from "@/lib/books/image-source";

describe("resolveBookImageSrc", () => {
  it("keeps local cached covers", () => {
    expect(resolveBookImageSrc("/covers/design.jpg", "/covers/fallback-book.jpg")).toBe(
      "/covers/design.jpg"
    );
  });

  it("falls back for empty values", () => {
    expect(resolveBookImageSrc("", "/covers/fallback-book.jpg")).toBe(
      "/covers/fallback-book.jpg"
    );
  });

  it("accepts external HTTPS images", () => {
    expect(
      resolveBookImageSrc(
        "https://covers.openlibrary.org/b/id/1104183-L.jpg",
        "/covers/fallback-book.jpg"
      )
    ).toBe("https://covers.openlibrary.org/b/id/1104183-L.jpg");
  });

  it.each(["//example.com/cover.jpg", "http://example.com/cover.jpg", "https://name:password@example.com/cover.jpg"])(
    "falls back for invalid cover URLs",
    (source) => {
      expect(resolveBookImageSrc(source, "/covers/fallback-book.jpg")).toBe("/covers/fallback-book.jpg");
    }
  );

  it("uses an explicitly selected external cover ahead of an unrelated cached image", () => {
    const asset = { originalUrl: "https://example.com/old.jpg", publicUrl: "/covers/old.jpg" };
    expect(getBookCoverAsset({ coverImage: "https://example.com/new.jpg", coverAssets: [asset] })).toBeNull();
    expect(getBookCoverAsset({ coverImage: asset.originalUrl, coverAssets: [asset] })).toBe(asset);
  });
});
