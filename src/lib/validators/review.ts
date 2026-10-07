import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Поставьте оценку от 1 до 5.").max(5, "Поставьте оценку от 1 до 5."),
  content: z.string().trim().min(10, "Отзыв должен содержать минимум 10 символов.").max(3000, "Отзыв слишком длинный.")
});

export type ReviewInput = z.infer<typeof reviewSchema>;
