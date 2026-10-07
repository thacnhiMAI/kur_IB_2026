import { normalizeSearchText } from "@/lib/search/filter";

export function matchesAdminQuery(haystack: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(haystack).includes(normalizedQuery);
}
