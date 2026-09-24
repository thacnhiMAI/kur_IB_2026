const APP_SHELL_CACHE = "smart-library-shell-v1";
const CONTENT_CACHE = "smart-library-content-v1";
const OFFLINE_FALLBACK_PATH = "/catalog";
const APP_SHELL_ASSETS = [
  "/",
  OFFLINE_FALLBACK_PATH,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

const OFFLINE_NAVIGATION_PATHS = new Set([
  "/catalog",
  "/favorites",
  "/recommendations"
]);

const BLOCKED_PATH_PREFIXES = ["/admin", "/api", "/auth"];

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }

  const normalized = pathname.replace(/\/+$/, "");

  return normalized.length > 0 ? normalized : "/";
}

function hasBlockedPrefix(pathname) {
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isOfflineSupportedNavigation(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  if (hasBlockedPrefix(normalizedPathname)) {
    return false;
  }

  return (
    OFFLINE_NAVIGATION_PATHS.has(normalizedPathname) ||
    /^\/books\/[^/]+$/.test(normalizedPathname)
  );
}

function shouldCacheNavigation(request, pathname) {
  return request.method === "GET" && isOfflineSupportedNavigation(pathname);
}

function shouldCacheCoverAsset(request, pathname) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    request.method === "GET" &&
    normalizedPathname.startsWith("/covers/") &&
    !hasBlockedPrefix(normalizedPathname)
  );
}

function shouldCacheAppAsset(request, pathname) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    request.method === "GET" &&
    normalizedPathname.startsWith("/_next/static/") &&
    !hasBlockedPrefix(normalizedPathname)
  );
}

function isCacheableDocumentResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  return (
    response.ok &&
    !response.redirected &&
    contentType.includes("text/html")
  );
}

async function putInCache(cacheName, request, response) {
  if (!response.ok || response.status === 206) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName !== APP_SHELL_CACHE && cacheName !== CONTENT_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" && shouldCacheNavigation(request, url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableDocumentResponse(response)) {
            event.waitUntil(putInCache(CONTENT_CACHE, request, response));
          }

          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);

          if (cachedResponse) {
            return cachedResponse;
          }

          const fallbackResponse = await caches.match(OFFLINE_FALLBACK_PATH);

          return fallbackResponse ?? Response.error();
        })
    );

    return;
  }

  if (shouldCacheCoverAsset(request, url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        const response = await fetch(request);

        if (response.ok) {
          event.waitUntil(putInCache(CONTENT_CACHE, request, response));
        }

        return response;
      })
    );

    return;
  }

  if (shouldCacheAppAsset(request, url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        const response = await fetch(request);

        if (response.ok) {
          event.waitUntil(putInCache(APP_SHELL_CACHE, request, response));
        }

        return response;
      })
    );
  }
});
