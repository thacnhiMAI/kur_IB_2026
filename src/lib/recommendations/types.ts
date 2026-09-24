export type RecommendationInsights = {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  finishedBooks: string[];
  highRatedThemes: string[];
};

export type RecommendationContext = {
  userId: string;
  favoriteBooks: Array<{ bookId: string; title: string }>;
  favoriteGenres: string[];
  favoriteAuthors: string[];
  readingSignals: Array<{
    bookId: string;
    title: string;
    eventType: "VIEWED" | "INTERESTED" | "FINISHED";
    genres: string[];
    authors: string[];
  }>;
  reviewedBooks: Array<{
    bookId: string;
    title: string;
    rating: number;
    content: string;
    genres: string[];
    authors: string[];
  }>;
  excludedBookIds: string[];
};

export type RecommendationResultItem = {
  bookId: string;
  reason: string;
  badge?: string;
  score?: number;
};

export type RecommendationResult = {
  summary: string;
  insights: RecommendationInsights;
  items: RecommendationResultItem[];
};
