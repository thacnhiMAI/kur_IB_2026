const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};

function transliterate(value: string) {
  return Array.from(value.toLowerCase())
    .map((character) => CYRILLIC_MAP[character] ?? character)
    .join("");
}

/**
 * Produces the canonical public slug used by /books/[slug].
 * Admin input may contain spaces, uppercase characters or a title copied into
 * the slug field; this normalizer makes the URL deterministic instead of
 * persisting a route such as /books/Note%20submodular.
 */
export function canonicalBookSlug(value: string, fallbackTitle = "") {
  const source = value.trim() || fallbackTitle.trim();
  const normalized = transliterate(source)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized.length >= 2) return normalized.slice(0, 160);

  const fallback = transliterate(fallbackTitle)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return (fallback || `book-${Date.now()}`).slice(0, 160);
}
