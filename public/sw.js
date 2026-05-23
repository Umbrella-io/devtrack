const STATIC_CACHE = "devtrack-static-v1";
const API_CACHE = "devtrack-api-v1";
const SKIP_CACHE_PATHS = ["/api/auth", "/_next/"];

const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const allowedCaches = [STATIC_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
  );

  self.clients.claim();
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkResponsePromise;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (SKIP_CACHE_PATHS.some((path) => url.pathname.startsWith(path))) {
    return;
  }

  // API responses: stale-while-revalidate
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Page navigation: show offline fallback on network failure
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clonedResponse = response.clone();

            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }

          return response;
        });
      }),
    );
  }
});
