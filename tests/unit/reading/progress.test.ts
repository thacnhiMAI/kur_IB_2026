import { describe, expect, it } from "vitest";

import { getCatalogReadingDot, normalizeReadingProgress } from "@/lib/reading/progress";

describe("normalizeReadingProgress", () => {
  it("returns in-progress when the book is partially read", () => {
    expect(normalizeReadingProgress({ progressPercent: 42, completedAt: null })).toEqual({
      percent: 42,
      status: "in-progress"
    });
  });

  it("returns completed when progress reaches 100", () => {
    expect(
      getCatalogReadingDot({ progressPercent: 100, completedAt: new Date("2026-09-25") })
    ).toBe("complete");
  });
});
