export function resolveBookImageSrc(
  src: string | null | undefined,
  fallback: string
) {
  if (typeof src !== "string") {
    return fallback;
  }

  const normalized = src.trim();

  if (normalized.length === 0) {
    return fallback;
  }

  // UI book covers must come from the local cache pipeline, not external hotlinks.
  if (normalized.startsWith("/")) {
    return normalized;
  }

  return fallback;
}
