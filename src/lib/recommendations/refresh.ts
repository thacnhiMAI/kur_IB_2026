import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getRecommendationCandidates, type RecommendationCandidate } from "@/lib/recommendations/candidates";
import { buildFallbackRecommendationResult } from "@/lib/recommendations/fallback";
import { getProvider, getProviderName } from "@/lib/recommendations/service";
import {
  createRecommendationContextHash,
  createRecommendationSnapshot,
  updateRecommendationSnapshot
} from "@/lib/recommendations/snapshot";
import { buildRecommendationContext } from "@/lib/recommendations/signals";
import type { RecommendationContext } from "@/lib/recommendations/types";

export type RecommendationRefreshTrigger =
  | "favorite"
  | "review"
  | "interest"
  | "finished"
  | "manual";

export async function enrichRecommendationSnapshot(
  snapshotId: string,
  context: RecommendationContext,
  candidates: RecommendationCandidate[]
) {
  const providerName = getProviderName();

  if (providerName === "fallback") {
    return null;
  }

  try {
    const provider = getProvider();
    const excluded = new Set(context.excludedBookIds);
    const candidateById = new Map(candidates.filter((book) => !excluded.has(book.id)).map((book) => [book.id, book]));
    const ordered = buildFallbackRecommendationResult(context, candidates).items
      .map((item) => candidateById.get(item.bookId))
      .filter((book) => book !== undefined);
    const shortlist = [...new Map([...ordered, ...candidateById.values()].map((book) => [book.id, book])).values()]
      .slice(0, 40)
      .map(({ id, title, description, authors, genres }) => ({
        bookId: id, title, description: description?.slice(0, 360), authors, genres
      }));
    if (!shortlist.length) throw new Error("No recommendation candidates");
    const enriched = await provider.getRecommendations(context, shortlist);
    const available = new Set(shortlist.map((book) => book.bookId));
    const items = enriched.items.filter((item) => available.delete(item.bookId)).slice(0, 12);
    if (!items.length) throw new Error("No valid recommendations returned");
    const snapshot = await updateRecommendationSnapshot(snapshotId, {
      provider: providerName,
      strategy: "ai-enriched",
      status: "ready",
      result: { ...enriched, items }
    });

    revalidatePath("/recommendations");
    return snapshot;
  } catch {
    try {
      const snapshot = await updateRecommendationSnapshot(snapshotId, {
        provider: providerName,
        status: "failed"
      });

      revalidatePath("/recommendations");
      return snapshot;
    } catch {
      return null;
    }
  }
}

export async function refreshRecommendationSnapshotForUser(
  userId: string,
  triggerSource: RecommendationRefreshTrigger
) {
  const context = await buildRecommendationContext(userId);
  const candidates = await getRecommendationCandidates();
  const contextHash = createRecommendationContextHash(context);
  const fallback = buildFallbackRecommendationResult(context, candidates);
  const providerName = getProviderName();

  const snapshot = await createRecommendationSnapshot({
    userId,
    provider: "fallback",
    strategy: "fallback",
    status: providerName === "fallback" ? "ready" : "enriching",
    triggerSource,
    contextHash,
    result: fallback
  });

  revalidatePath("/recommendations");
  if (providerName !== "fallback") {
    after(async () => { await enrichRecommendationSnapshot(snapshot.id, context, candidates); });
  }

  return snapshot;
}
