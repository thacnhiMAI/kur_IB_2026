import { describe, expect, it } from "vitest";

import { matchesAdminQuery } from "@/lib/admin/admin-search";

describe("matchesAdminQuery", () => {
  it("matches by name", () => {
    expect(matchesAdminQuery("Лев Толстой", "толст")).toBe(true);
  });

  it("matches by slug", () => {
    expect(matchesAdminQuery("Leo Tolstoy (leo-tolstoy)", "leo-t")).toBe(true);
  });

  it("ignores extra spaces and case", () => {
    expect(matchesAdminQuery("Clean Architecture", "  clean    arch ")).toBe(true);
  });

  it("returns true on empty query", () => {
    expect(matchesAdminQuery("Anything", "")).toBe(true);
  });
});
