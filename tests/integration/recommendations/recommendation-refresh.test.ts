import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePath,
  buildRecommendationContext,
  getRecommendationCandidates,
  buildFallbackRecommendationResult,
  createRecommendationContextHash,
  createRecommendationSnapshot,
  updateRecommendationSnapshot
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  buildRecommendationContext: vi.fn(),
  getRecommendationCandidates: vi.fn(),
  buildFallbackRecommendationResult: vi.fn(),
  createRecommendationContextHash: vi.fn(),
  createRecommendationSnapshot: vi.fn(),
  updateRecommendationSnapshot: vi.fn()
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
  createRecommendationSnapshot,
  updateRecommendationSnapshot
}));

import { enrichRecommendationSnapshot, refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";
import type { RecommendationCandidate } from "@/lib/recommendations/candidates";
import type { RecommendationContext } from "@/lib/recommendations/types";

describe("refreshRecommendationSnapshotForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_PROVIDER", "fallback");
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
    const candidates: [] = [];
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

  it("persists the model's ranking after filtering duplicates, excluded books, and invented IDs", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "unit-test-key");
    const context: RecommendationContext = {
      userId: "user-1", favoriteBooks: [], favoriteGenres: [], favoriteAuthors: [], reviewedBooks: [],
      readingSignals: [{ bookId: "finished", title: "Finished book", eventType: "FINISHED", genres: ["Design"], authors: [] }],
      excludedBookIds: ["finished"]
    };
    const candidates: RecommendationCandidate[] = ["a", "b", "finished"].map((id) => ({
      id, slug: id, title: id, coverImage: null, authors: [], genres: ["Design"],
      ratingAverage: null, ratingsCount: null
    }));
    const reason = "A similar subject and perspective.";
    const items = ["b", "b", "invented", "finished", "a"].map((bookId) => ({ bookId, reason }));
    const insights = { favoriteGenres: [], favoriteAuthors: [], finishedBooks: [], highRatedThemes: [] };
    buildFallbackRecommendationResult.mockReturnValue({ items: [items[4], items[0]] });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: JSON.stringify({ summary: "Model-generated shortlist", insights, items }) } }]
    }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await enrichRecommendationSnapshot("snapshot-1", context, candidates);
      expect(updateRecommendationSnapshot).toHaveBeenCalledWith("snapshot-1", expect.objectContaining({
        provider: "openai", status: "ready", result: expect.objectContaining({ items: [items[0], items[4]] })
      }));
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(JSON.parse(body.messages[1].content)).toMatchObject({
        candidates: [{ bookId: "a" }, { bookId: "b" }],
        readingHistory: [{ title: "Finished book", eventType: "FINISHED" }]
      });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
