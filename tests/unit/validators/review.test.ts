import { describe, expect, it } from "vitest";

import { reviewSchema } from "@/lib/validators/review";

describe("reviewSchema", () => {
  it("accepts a 1-5 star rating and a meaningful review", () => {
    expect(reviewSchema.parse({ rating: 5, content: "Очень понравилась эта книга." })).toEqual({
      rating: 5,
      content: "Очень понравилась эта книга."
    });
  });

  it("rejects ratings outside the five-star scale", () => {
    expect(() => reviewSchema.parse({ rating: 6, content: "Достаточно длинный отзыв." })).toThrow();
  });
});
