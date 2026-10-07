import { z } from "zod";

export const bookSchema = z.object({
  title: z.string().min(2, "Название должно содержать минимум 2 символа."),
  subtitle: z.string().optional(),
  originalTitle: z.string().optional(),
  slug: z.string().min(2, "Slug должен содержать минимум 2 символа.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug может содержать только латинские буквы, цифры и дефисы."),
  description: z.string().min(10, "Описание должно быть информативным."),
  coverImage: z
    .union([z.literal(""), z.string().url(), z.string().startsWith("/covers/")])
    .optional(),
  year: z.number().int().min(1000).max(2100),
  isbn: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  language: z.string().min(2),
  pages: z.number().int().positive(),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true)
});

export type BookInput = z.infer<typeof bookSchema>;
