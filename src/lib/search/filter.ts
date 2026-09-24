import type { SearchableItem } from "@/lib/search/types";

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function filterSearchItems<T extends SearchableItem>(
  items: T[],
  query: string
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystack = normalizeSearchText(
      [
        item.title,
        item.subtitle ?? "",
        item.authors.join(" "),
        item.description,
        item.tags.join(" "),
        item.reason
      ].join(" ")
    );

    return haystack.includes(normalizedQuery);
  });
}
