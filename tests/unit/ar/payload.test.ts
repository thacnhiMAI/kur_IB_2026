import { describe, expect, it } from "vitest";

import { buildARBookPayload } from "@/lib/ar/payload";

describe("buildARBookPayload", () => {
  it("prefers cached cover metadata and keeps the AR payload compact", () => {
    const payload = buildARBookPayload({
      id: "book-1",
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: "Исправленное издание",
      description: "Классическая книга о проектировании.",
      coverImage: "/covers/design.jpg",
      dominantColor: "#112233",
      authors: ["Дон Норман"]
    });

    expect(payload).toEqual({
      slug: "design-of-everyday-things",
      title: "Дизайн привычных вещей",
      subtitle: "Исправленное издание",
      description: "Классическая книга о проектировании.",
      coverImage: "/covers/design.jpg",
      dominantColor: "#112233",
      authors: ["Дон Норман"]
    });
  });

  it("falls back to the shared project cover when no book cover exists", () => {
    const payload = buildARBookPayload({
      id: "book-2",
      slug: "missing-cover",
      title: "Без обложки",
      subtitle: null,
      description: "Тестовая книга без обложки.",
      coverImage: null,
      dominantColor: null,
      authors: ["Unknown Author"]
    });

    expect(payload.coverImage).toBe("/covers/fallback-book.jpg");
    expect(payload.dominantColor).toBe("#0F172A");
  });
});
