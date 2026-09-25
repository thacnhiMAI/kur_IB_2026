import { z } from "zod";

export const taxonomySchema = z.object({
  name: z.string().min(2, "Название должно содержать минимум 2 символа."),
  slug: z.string().min(2, "Slug должен содержать минимум 2 символа.")
});

export type TaxonomyInput = z.infer<typeof taxonomySchema>;
