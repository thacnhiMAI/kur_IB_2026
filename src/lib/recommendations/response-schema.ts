import { z } from "zod";

export const recommendationInsightsSchema = z.object({
  favoriteGenres: z.array(z.string()),
  favoriteAuthors: z.array(z.string()),
  finishedBooks: z.array(z.string()),
  highRatedThemes: z.array(z.string())
});

export const recommendationEnrichmentSchema = z.object({
  summary: z.string().min(10),
  insights: recommendationInsightsSchema,
  items: z.array(
    z.object({
      bookId: z.string().min(1),
      reason: z.string().min(10),
      badge: z.string().optional()
    })
  )
});
