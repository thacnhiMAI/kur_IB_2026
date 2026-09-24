import { revalidatePath } from "next/cache";

import { getRecommendationCandidates } from "@/lib/recommendations/candidates";
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
  context: RecommendationContext
) {
  const providerName = getProviderName();

  if (providerName === "fallback") {
    return null;
  }

  try {
    const provider = getProvider();
    const enriched = await provider.getRecommendations(context);
    const snapshot = await updateRecommendationSnapshot(snapshotId, {
      provider: providerName,
      strategy: "ai-enriched",
      status: "ready",
      result: enriched
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
  void enrichRecommendationSnapshot(snapshot.id, context);

  return snapshot;
}
