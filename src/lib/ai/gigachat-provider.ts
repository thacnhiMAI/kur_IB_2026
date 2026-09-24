import type { AIProvider, RecommendationContext, RecommendationResult } from "@/lib/ai/provider";
import { recommendationEnrichmentSchema } from "@/lib/recommendations/response-schema";

export function parseGigaChatRecommendationResponse(content: string): RecommendationResult {
  return recommendationEnrichmentSchema.parse(JSON.parse(content));
}

export class GigaChatProvider implements AIProvider {
  async getRecommendations(context: RecommendationContext): Promise<RecommendationResult> {
    void context;

    const clientId = process.env.GIGACHAT_CLIENT_ID;
    const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GigaChat credentials are not configured.");
    }

    throw new Error(
      "GigaChat provider transport is not wired yet. The response contract expects the recommendation enrichment schema."
    );
  }
}
