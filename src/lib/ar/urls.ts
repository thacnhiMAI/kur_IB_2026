import { getBaseUrl } from "@/lib/site/url";

export function getARRoutePath(slug: string) {
  return `/ar/books/${slug}`;
}

export function getARAbsoluteUrl(slug: string, baseUrl?: string) {
  const origin = baseUrl ?? getBaseUrl();

  return new URL(getARRoutePath(slug), origin).toString();
}
