import { describe, expect, it } from "vitest";

import { canonicalBookSlug } from "@/lib/books/slug";

describe("canonicalBookSlug", () => {
  it("normalizes an admin title copied into the slug field", () => {
    expect(canonicalBookSlug("Note submodular")).toBe("note-submodular");
  });

  it("transliterates common Cyrillic titles", () => {
    expect(canonicalBookSlug("Умная библиотека")).toBe("umnaya-biblioteka");
  });

  it("falls back to the title when slug is blank", () => {
    expect(canonicalBookSlug("", "Design Notes")).toBe("design-notes");
  });
});
