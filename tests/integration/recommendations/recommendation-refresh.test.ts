import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePath,
  buildRecommendationContext,
  getRecommendationCandidates,
  buildFallbackRecommendationResult,
  createRecommendationContextHash,
  createRecommendationSnapshot
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  buildRecommendationContext: vi.fn(),
  getRecommendationCandidates: vi.fn(),
  buildFallbackRecommendationResult: vi.fn(),
  createRecommendationContextHash: vi.fn(),
  createRecommendationSnapshot: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath
}));

vi.mock("@/lib/recommendations/signals", () => ({
  buildRecommendationContext
}));

vi.mock("@/lib/recommendations/candidates", () => ({
  getRecommendationCandidates
}));

vi.mock("@/lib/recommendations/fallback", () => ({
  buildFallbackRecommendationResult
}));

vi.mock("@/lib/recommendations/snapshot", () => ({
  createRecommendationContextHash,
  createRecommendationSnapshot
}));

import { refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";

describe("refreshRecommendationSnapshotForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a fallback snapshot first and returns it before enrichment", async () => {
    const context = {
      userId: "user-1",
      favoriteBooks: [],
      favoriteGenres: ["Дизайн"],
      favoriteAuthors: ["Don Norman"],
      readingSignals: [],
      reviewedBooks: [],
      excludedBookIds: []
    };
    const candidates = [];
    const fallbackResult = {
      summary: "Fallback summary",
      insights: {
        favoriteGenres: ["Дизайн"],
        favoriteAuthors: ["Don Norman"],
        finishedBooks: [],
        highRatedThemes: []
      },
      items: [{ bookId: "book-1", reason: "Fallback reason", badge: "genre-match", score: 9 }]
    };
    const createdSnapshot = { id: "snapshot-1", status: "ready", strategy: "fallback" };

    buildRecommendationContext.mockResolvedValue(context);
    getRecommendationCandidates.mockResolvedValue(candidates);
    createRecommendationContextHash.mockReturnValue("context-hash");
    buildFallbackRecommendationResult.mockReturnValue(fallbackResult);
    createRecommendationSnapshot.mockResolvedValue(createdSnapshot);

    const snapshot = await refreshRecommendationSnapshotForUser("user-1", "favorite");

    expect(buildRecommendationContext).toHaveBeenCalledWith("user-1");
    expect(getRecommendationCandidates).toHaveBeenCalledTimes(1);
    expect(createRecommendationContextHash).toHaveBeenCalledWith(context);
    expect(buildFallbackRecommendationResult).toHaveBeenCalledWith(context, candidates);
    expect(createRecommendationSnapshot).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "fallback",
      strategy: "fallback",
      status: "ready",
      triggerSource: "favorite",
      contextHash: "context-hash",
      result: fallbackResult
    });
    expect(revalidatePath).toHaveBeenCalledWith("/recommendations");
    expect(snapshot).toEqual(createdSnapshot);
  });
});
