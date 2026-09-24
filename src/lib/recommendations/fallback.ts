import { buildRecommendationInsights } from "@/lib/recommendations/insights";
import { buildFallbackReason, buildFallbackSummary } from "@/lib/recommendations/reasons";
import type {
  RecommendationContext,
  RecommendationResult,
  RecommendationResultItem
} from "@/lib/recommendations/types";

type CandidateBook = {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
  ratingAverage: number | null;
  ratingsCount: number | null;
};

function intersectionCount(values: string[], matches: Set<string>) {
  return values.filter((value) => matches.has(value)).length;
}

function buildSignalSets(context: RecommendationContext) {
  const favoriteAuthors = new Set(context.favoriteAuthors);
  const favoriteGenres = new Set(context.favoriteGenres);
  const finishedAuthors = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "FINISHED")
      .flatMap((signal) => signal.authors)
  );
  const finishedGenres = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "FINISHED")
      .flatMap((signal) => signal.genres)
  );
  const interestedAuthors = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "INTERESTED")
      .flatMap((signal) => signal.authors)
  );
  const interestedGenres = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "INTERESTED")
      .flatMap((signal) => signal.genres)
  );
  const viewedAuthors = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "VIEWED")
      .flatMap((signal) => signal.authors)
  );
  const viewedGenres = new Set(
    context.readingSignals
      .filter((signal) => signal.eventType === "VIEWED")
      .flatMap((signal) => signal.genres)
  );
  const highRatedAuthors = new Set(
    context.reviewedBooks
      .filter((review) => review.rating >= 4)
      .flatMap((review) => review.authors)
  );
  const highRatedGenres = new Set(
    context.reviewedBooks
      .filter((review) => review.rating >= 4)
      .flatMap((review) => review.genres)
  );

  return {
    favoriteAuthors,
    favoriteGenres,
    finishedAuthors,
    finishedGenres,
    interestedAuthors,
    interestedGenres,
    viewedAuthors,
    viewedGenres,
    highRatedAuthors,
    highRatedGenres
  };
}

function scoreCandidate(context: RecommendationContext, candidate: CandidateBook) {
  const signals = buildSignalSets(context);
  const authorMatches = intersectionCount(candidate.authors, signals.favoriteAuthors);
  const genreMatches = intersectionCount(candidate.genres, signals.favoriteGenres);
  const finishedAuthorMatches = intersectionCount(candidate.authors, signals.finishedAuthors);
  const finishedGenreMatches = intersectionCount(candidate.genres, signals.finishedGenres);
  const interestedAuthorMatches = intersectionCount(candidate.authors, signals.interestedAuthors);
  const interestedGenreMatches = intersectionCount(candidate.genres, signals.interestedGenres);
  const viewedAuthorMatches = intersectionCount(candidate.authors, signals.viewedAuthors);
  const viewedGenreMatches = intersectionCount(candidate.genres, signals.viewedGenres);
  const highRatedAuthorMatches = intersectionCount(candidate.authors, signals.highRatedAuthors);
  const highRatedGenreMatches = intersectionCount(candidate.genres, signals.highRatedGenres);
  const popularity = Math.min((candidate.ratingAverage ?? 0) + (candidate.ratingsCount ?? 0) / 5000, 3);

  return (
    authorMatches * 8 +
    genreMatches * 5 +
    finishedAuthorMatches * 6 +
    finishedGenreMatches * 4 +
    highRatedAuthorMatches * 4 +
    highRatedGenreMatches * 3 +
    interestedAuthorMatches * 3 +
    interestedGenreMatches * 2 +
    viewedAuthorMatches * 1.5 +
    viewedGenreMatches +
    popularity
  );
}

export function rankFallbackRecommendations<T extends { score: number }>(items: T[]) {
  return [...items].sort((left, right) => right.score - left.score);
}

export function buildFallbackRecommendationResult(
  context: RecommendationContext,
  candidates: CandidateBook[]
): RecommendationResult {
  const ranked: RecommendationResultItem[] = rankFallbackRecommendations(
    candidates
      .filter((candidate) => !context.excludedBookIds.includes(candidate.id))
      .map((candidate) => {
        const { reason, badge } = buildFallbackReason(context, candidate);

        return {
          bookId: candidate.id,
          reason,
          badge,
          score: scoreCandidate(context, candidate)
        };
      })
  ).slice(0, 6);

  return {
    summary: buildFallbackSummary(context),
    insights: buildRecommendationInsights(context),
    items: ranked
  };
}
