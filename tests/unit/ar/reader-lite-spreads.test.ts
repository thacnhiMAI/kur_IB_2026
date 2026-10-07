import { describe, expect, it } from "vitest";

import { buildReaderLiteSpreads } from "@/components/ar/reader-lite-spreads";

describe("buildReaderLiteSpreads", () => {
  it("builds a fixed sequence of readable spreads from catalog metadata", () => {
    const spreads = buildReaderLiteSpreads({
      slug: "babel",
      title: "Babel",
      subtitle: "Or the Necessity of Violence",
      description: "A dark academic fantasy about language and empire.",
      coverImage: "/covers/babel.jpg",
      dominantColor: "#2F1E4D",
      authors: ["R. F. Kuang"],
      year: 2022,
      language: "en",
      pages: 560,
      publisher: "Harper Voyager",
      edition: "Hardcover"
    });

    expect(spreads.map((spread) => spread.id)).toEqual([
      "cover",
      "intro",
      "summary",
      "ar-note"
    ]);
    expect(spreads[1].left.title).toBe("About this book");
    expect(spreads[2].left.lines).toContain("560 pages");
  });
});
