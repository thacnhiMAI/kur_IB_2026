import { describe, expect, it } from "vitest";

import { reviewSchema } from "@/lib/validators/review";

describe("reviewSchema", () => {
  it("rejects ratings outside the 1-5 range", () => {
    const result = reviewSchema.safeParse({
      rating: 6,
      content: "Слишком высокий рейтинг, такой отзыв должен быть отклонён системой."
    });

    expect(result.success).toBe(false);
  });
});
