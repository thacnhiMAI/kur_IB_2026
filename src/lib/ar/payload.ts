import {
  DEFAULT_AR_COLOR,
  DEFAULT_AR_COVER,
  type ARBookPayload
} from "@/lib/ar/types";

type ARPayloadInput = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  coverImage: string | null;
  dominantColor: string | null;
  authors: string[];
  year: number;
  language: string;
  pages: number;
  publisher: string | null;
  edition: string | null;
};

export function buildARBookPayload(input: ARPayloadInput): ARBookPayload {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    coverImage: input.coverImage ?? DEFAULT_AR_COVER,
    dominantColor: input.dominantColor ?? DEFAULT_AR_COLOR,
    authors: input.authors,
    year: input.year,
    language: input.language,
    pages: input.pages,
    publisher: input.publisher,
    edition: input.edition
  };
}
