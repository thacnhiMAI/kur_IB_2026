export const APP_SHELL_CACHE = "smart-library-shell-v1";
export const CONTENT_CACHE = "smart-library-content-v1";
export const OFFLINE_FALLBACK_PATH = "/catalog";

export const APP_SHELL_ASSETS = [
  "/",
  OFFLINE_FALLBACK_PATH,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
] as const;

const OFFLINE_NAVIGATION_PATHS = new Set([
  "/catalog",
  "/favorites",
  "/recommendations"
]);

const BLOCKED_PATH_PREFIXES = ["/admin", "/api", "/auth"] as const;

function normalizePathname(pathname: string) {
  if (!pathname) {
    return "/";
  }

  const normalized = pathname.replace(/\/+$/, "");

  return normalized.length > 0 ? normalized : "/";
}

function hasBlockedPrefix(pathname: string) {
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isOfflineSupportedNavigation(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (hasBlockedPrefix(normalizedPathname)) {
    return false;
  }

  return (
    OFFLINE_NAVIGATION_PATHS.has(normalizedPathname) ||
    /^\/books\/[^/]+$/.test(normalizedPathname)
  );
}

export function shouldCacheNavigation(request: {
  method: string;
  pathname: string;
}) {
  return (
    request.method.toUpperCase() === "GET" &&
    isOfflineSupportedNavigation(request.pathname)
  );
}

export function shouldCacheCoverAsset(request: {
  method: string;
  pathname: string;
}) {
  const normalizedPathname = normalizePathname(request.pathname);

  return (
    request.method.toUpperCase() === "GET" &&
    normalizedPathname.startsWith("/covers/") &&
    !hasBlockedPrefix(normalizedPathname)
  );
}

export function shouldCacheAppAsset(request: {
  method: string;
  pathname: string;
}) {
  const normalizedPathname = normalizePathname(request.pathname);

  return (
    request.method.toUpperCase() === "GET" &&
    normalizedPathname.startsWith("/_next/static/") &&
    !hasBlockedPrefix(normalizedPathname)
  );
}
