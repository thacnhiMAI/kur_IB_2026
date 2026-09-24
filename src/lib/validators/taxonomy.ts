import { z } from "zod";

export const taxonomySchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự."),
  slug: z.string().min(2, "Slug phải có ít nhất 2 ký tự.")
});

export type TaxonomyInput = z.infer<typeof taxonomySchema>;
