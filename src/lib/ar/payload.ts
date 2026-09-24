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
};

export function buildARBookPayload(input: ARPayloadInput): ARBookPayload {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    coverImage: input.coverImage ?? DEFAULT_AR_COVER,
    dominantColor: input.dominantColor ?? DEFAULT_AR_COLOR,
    authors: input.authors
  };
}
