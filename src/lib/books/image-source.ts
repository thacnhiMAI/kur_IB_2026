export function isExternalBookImage(src: string) {
  if (!/^https:\/\//i.test(src)) return false;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getBookCoverAsset<T extends { originalUrl?: string; publicUrl: string }>(book: {
  coverImage: string | null;
  coverAssets: T[];
}) {
  const image = book.coverImage?.trim();
  if (image && isExternalBookImage(image)) {
    return book.coverAssets.find((asset) => !asset.originalUrl || asset.originalUrl === image) ?? null;
  }

  return book.coverAssets[0] ?? null;
}

export function resolveBookImageSrc(
  src: string | null | undefined,
  fallback: string
) {
  if (typeof src !== "string") {
    return fallback;
  }

  const normalized = src.trim();

  if (/^\/(?![\\/])/.test(normalized) || isExternalBookImage(normalized)) {
    return normalized;
  }

  return fallback;
}
