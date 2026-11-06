import type {
  RecommendationContext,
  RecommendationResult
} from "@/lib/recommendations/types";

export type { RecommendationContext, RecommendationResult } from "@/lib/recommendations/types";

export type AICandidate = { bookId: string; title: string; description?: string; authors: string[]; genres: string[] };

export interface AIProvider {
  getRecommendations(context: RecommendationContext, candidates: AICandidate[]): Promise<RecommendationResult>;
}
