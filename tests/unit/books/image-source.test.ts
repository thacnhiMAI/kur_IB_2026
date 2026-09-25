import { describe, expect, it } from "vitest";

import { resolveBookImageSrc } from "@/lib/books/image-source";

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

  it("falls back for external hotlinks", () => {
    expect(
      resolveBookImageSrc(
        "https://covers.openlibrary.org/b/id/1104183-L.jpg",
        "/covers/fallback-book.jpg"
      )
    ).toBe("/covers/fallback-book.jpg");
  });
});
