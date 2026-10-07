export function getARRoutePath(slug: string) {
  return `/ar/books/${encodeURIComponent(slug)}`;
}

/**
 * Server-side absolute AR URL helper. For share/QR URLs use the /api/ar/share-url
 * endpoint because it can also resolve the development machine's LAN address.
 */
export function getARAbsoluteUrl(slug: string, baseUrl?: string) {
  const origin =
    baseUrl ??
    process.env.AR_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_AR_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  return new URL(getARRoutePath(slug), origin).toString();
}
