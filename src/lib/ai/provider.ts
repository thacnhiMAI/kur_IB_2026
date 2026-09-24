import type {
  RecommendationContext,
  RecommendationResult
} from "@/lib/recommendations/types";

export type { RecommendationContext, RecommendationResult } from "@/lib/recommendations/types";

export interface AIProvider {
  getRecommendations(context: RecommendationContext): Promise<RecommendationResult>;
}
