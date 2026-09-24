import type { RecommendationContext } from "@/lib/recommendations/types";

type CandidateProfile = {
  authors: string[];
  genres: string[];
};

function toSignalSets(context: RecommendationContext) {
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
    highRatedAuthors,
    highRatedGenres
  };
}

function hasOverlap(values: string[], candidates: Set<string>) {
  return values.some((value) => candidates.has(value));
}

export function buildFallbackReason(context: RecommendationContext, candidate: CandidateProfile) {
  const signals = toSignalSets(context);

  if (hasOverlap(candidate.authors, signals.favoriteAuthors)) {
    return {
      reason: "Рекомендуем книгу из-за совпадения с вашими любимыми авторами.",
      badge: "author-match"
    };
  }

  if (hasOverlap(candidate.authors, signals.finishedAuthors)) {
    return {
      reason: "Рекомендуем книгу на основе авторов, которых вы уже дочитывали до конца.",
      badge: "finished-author-match"
    };
  }

  if (hasOverlap(candidate.genres, signals.favoriteGenres)) {
    return {
      reason: "Рекомендуем книгу на основе жанров, которые вы чаще всего выбираете.",
      badge: "genre-match"
    };
  }

  if (hasOverlap(candidate.genres, signals.finishedGenres)) {
    return {
      reason: "Рекомендуем книгу на основе жанров из завершённых вами книг.",
      badge: "finished-genre-match"
    };
  }

  if (
    hasOverlap(candidate.authors, signals.highRatedAuthors) ||
    hasOverlap(candidate.genres, signals.highRatedGenres)
  ) {
    return {
      reason: "Рекомендуем книгу на основе тем и авторов, которые вы оценивали особенно высоко.",
      badge: "high-rated-theme"
    };
  }

  return {
    reason: "Рекомендуем книгу как сильный следующий шаг по вашему читательскому профилю.",
    badge: "profile-match"
  };
}

export function buildFallbackSummary(context: RecommendationContext) {
  if (context.favoriteAuthors.length > 0 && context.favoriteGenres.length > 0) {
    return "Подборка собрана из любимых авторов, жанров и книг, которые вы уже завершили.";
  }

  if (context.favoriteGenres.length > 0) {
    return "Подборка собрана из любимых жанров и истории чтения.";
  }

  return "Подборка собрана из истории чтения, оценок и сигналов профиля.";
}
