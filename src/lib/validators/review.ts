import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z
    .string()
    .min(20, "Отзыв должен содержать минимум 20 символов.")
    .max(2000, "Отзыв не должен превышать 2000 символов.")
});

export type ReviewInput = z.infer<typeof reviewSchema>;
