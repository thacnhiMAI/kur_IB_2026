import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, recordReadingEvent, createReview, refreshRecommendationSnapshotForUser, revalidatePath } =
  vi.hoisted(() => ({
    requireUser: vi.fn(),
    recordReadingEvent: vi.fn(),
    createReview: vi.fn(),
    refreshRecommendationSnapshotForUser: vi.fn(),
    revalidatePath: vi.fn()
  }));

vi.mock("next/cache", () => ({
  revalidatePath
}));

vi.mock("@/auth", () => ({
  auth: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {}
}));

vi.mock("@/lib/auth", () => ({
  requireUser
}));

vi.mock("@/lib/reading-history/actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reading-history/actions")>(
    "@/lib/reading-history/actions"
  );

  return {
    ...actual,
    recordReadingEvent
  };
});

vi.mock("@/lib/reviews/actions", () => ({
  createReview
}));

vi.mock("@/lib/recommendations/refresh", () => ({
  refreshRecommendationSnapshotForUser
}));

import {
  recordBookFinished,
  recordBookInterest,
  submitBookReview
} from "@/lib/books/actions";
import { normalizeReadingEvent } from "@/lib/reading-history/actions";

describe("normalizeReadingEvent", () => {
  it("maps detail page opens to VIEWED events", () => {
    expect(normalizeReadingEvent("view")).toBe("VIEWED");
  });
});

describe("book signal actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: "user-1",
      name: "Reader",
      email: "reader@example.com",
      role: "USER"
    });
    recordReadingEvent.mockResolvedValue({ id: "history-1" });
    createReview.mockResolvedValue({ id: "review-1" });
    refreshRecommendationSnapshotForUser.mockResolvedValue({ id: "snapshot-1" });
  });

  it("refreshes recommendation snapshot after recording interest", async () => {
    const formData = new FormData();
    formData.set("bookId", "book-1");
    formData.set("slug", "design-of-everyday-things");

    await recordBookInterest(formData);

    expect(recordReadingEvent).toHaveBeenCalledWith("book-1", "interest");
    expect(refreshRecommendationSnapshotForUser).toHaveBeenCalledWith("user-1", "interest");
    expect(recordReadingEvent.mock.invocationCallOrder[0]).toBeLessThan(
      refreshRecommendationSnapshotForUser.mock.invocationCallOrder[0]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/recommendations");
    expect(revalidatePath).toHaveBeenCalledWith("/books/design-of-everyday-things");
  });

  it("refreshes recommendation snapshot after recording a finished signal", async () => {
    const formData = new FormData();
    formData.set("bookId", "book-1");
    formData.set("slug", "design-of-everyday-things");

    await recordBookFinished(formData);

    expect(recordReadingEvent).toHaveBeenCalledWith("book-1", "finished");
    expect(refreshRecommendationSnapshotForUser).toHaveBeenCalledWith("user-1", "finished");
    expect(recordReadingEvent.mock.invocationCallOrder[0]).toBeLessThan(
      refreshRecommendationSnapshotForUser.mock.invocationCallOrder[0]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/recommendations");
    expect(revalidatePath).toHaveBeenCalledWith("/books/design-of-everyday-things");
  });

  it("refreshes recommendation snapshot after saving a review", async () => {
    const formData = new FormData();
    formData.set("bookId", "book-1");
    formData.set("slug", "design-of-everyday-things");
    formData.set("rating", "5");
    formData.set("content", "Strong follow-up for UX readers.");

    await submitBookReview(formData);

    expect(createReview).toHaveBeenCalledWith({
      bookId: "book-1",
      rating: 5,
      content: "Strong follow-up for UX readers.",
      redirectSlug: "design-of-everyday-things"
    });
    expect(refreshRecommendationSnapshotForUser).toHaveBeenCalledWith("user-1", "review");
    expect(createReview.mock.invocationCallOrder[0]).toBeLessThan(
      refreshRecommendationSnapshotForUser.mock.invocationCallOrder[0]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/recommendations");
  });
});
