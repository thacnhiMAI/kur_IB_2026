const APP_SHELL_CACHE = "smart-library-shell-v2";
const CONTENT_CACHE = "smart-library-content-v2";
const OFFLINE_FALLBACK_PATH = "/catalog";
const APP_SHELL_ASSETS = [
  "/",
  OFFLINE_FALLBACK_PATH,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

const OFFLINE_NAVIGATION_PATHS = new Set(["/catalog"]);

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
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(APP_SHELL_ASSETS.map((url) => new Request(url, { credentials: "omit" })))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith("smart-library-") &&
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
            // Shared browser caches must contain only public content.
            event.waitUntil(fetch(request.url, { credentials: "omit" }).then((publicResponse) => {
              if (isCacheableDocumentResponse(publicResponse)) {
                return putInCache(CONTENT_CACHE, request.url, publicResponse);
              }
            }).catch(() => undefined));
          }

          return response;
        })
        .catch(async () => {
          const content = await caches.open(CONTENT_CACHE);
          const cachedResponse = await content.match(request);

          if (cachedResponse) {
            return cachedResponse;
          }

          const fallbackResponse = await content.match(OFFLINE_FALLBACK_PATH) ?? await caches.match(OFFLINE_FALLBACK_PATH);

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

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }
  if (typeof data.title !== "string" || typeof data.body !== "string" || typeof data.href !== "string") return;
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/icon-192.png",
    tag: data.tag,
    data: { href: data.href }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href;
  const target = typeof href === "string" && /^\/books\/[^/?#]+$/.test(href) ? href : "/catalog";
  const url = new URL(target, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === url);
    return existing ? existing.focus() : self.clients.openWindow(url);
  }));
});
