import type { AIProvider } from "@/lib/ai/provider";
import { GigaChatProvider } from "@/lib/ai/gigachat-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { getRecommendationCandidates } from "@/lib/recommendations/candidates";
import { buildFallbackRecommendationResult } from "@/lib/recommendations/fallback";
import { buildRecommendationContext } from "@/lib/recommendations/signals";
import type { RecommendationResult } from "@/lib/recommendations/types";

export { buildRecommendationContext } from "@/lib/recommendations/signals";
export { getLatestRecommendationSnapshot } from "@/lib/recommendations/snapshot";

export type RecommendationProviderName = "fallback" | "openai" | "gigachat";

export function getProviderName(): RecommendationProviderName {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (provider === "openai" || provider === "gigachat") {
    return provider;
  }

  return "fallback";
}

export function getProvider(): AIProvider {
  const provider = getProviderName();

  if (provider === "openai") {
    return new OpenAIProvider();
  }

  if (provider === "gigachat") {
    return new GigaChatProvider();
  }

  throw new Error("No external AI provider configured.");
}

export async function buildFallbackRecommendations(userId: string): Promise<RecommendationResult> {
  const context = await buildRecommendationContext(userId);
  const candidates = await getRecommendationCandidates();

  return buildFallbackRecommendationResult(context, candidates);
}

export async function generateRecommendationsForUser(userId: string) {
  const { refreshRecommendationSnapshotForUser } = await import("@/lib/recommendations/refresh");

  return refreshRecommendationSnapshotForUser(userId, "manual");
}
