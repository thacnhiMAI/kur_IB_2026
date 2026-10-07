import { z } from "zod";

export const bookContentInputSchema = z.object({
  externalUrl: z
    .string()
    .trim()
    .url("Укажите корректную внешнюю ссылку.")
    .optional()
    .or(z.literal("")),
  makePdfPrimary: z.boolean().default(false)
});

export type BookContentInput = z.infer<typeof bookContentInputSchema>;
