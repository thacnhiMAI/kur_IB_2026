import { describe, expect, it } from "vitest";

import { buildBookMetadata, buildPageMetadata } from "@/lib/site/metadata";

describe("site metadata", () => {
  it("builds page metadata with canonical URLs", () => {
    const metadata = buildPageMetadata({
      title: "Каталог",
      description: "Каталог книг",
      path: "/catalog",
      baseUrl: "https://smart-library.example"
    });

    expect(String(metadata.alternates?.canonical)).toBe(
      "https://smart-library.example/catalog"
    );
  });

  it("builds book metadata with Open Graph image support", () => {
    const metadata = buildBookMetadata({
      title: "Дизайн привычных вещей",
      description: "Книга о проектировании.",
      path: "/books/design-of-everyday-things",
      baseUrl: "https://smart-library.example",
      imagePath: "/covers/design-of-everyday-things.jpg"
    });

    expect(metadata.openGraph).toMatchObject({
      images: [
        {
          url: "https://smart-library.example/covers/design-of-everyday-things.jpg"
        }
      ]
    });
  });

  it("supports noindex pages", () => {
    const metadata = buildPageMetadata({
      title: "Рекомендации",
      description: "Персональные рекомендации.",
      path: "/recommendations",
      baseUrl: "https://smart-library.example",
      noIndex: true
    });

    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false
    });
  });
});
