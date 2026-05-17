const CACHE_VERSION = "devtrack-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = ["/", OFFLINE_URL, "/manifest.json"];

const STATIC_DESTINATIONS = new Set([
  "script",
  "style",
  "image",
  "font",
  "worker",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              ![STATIC_CACHE, PAGE_CACHE, API_CACHE].includes(cacheName)
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  if (
    requestUrl.pathname.startsWith("/_next/static/") ||
    STATIC_DESTINATIONS.has(event.request.destination)
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(event.request, API_CACHE));
  }
});

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const cachedOffline = await caches.match(OFFLINE_URL);

    if (cachedOffline) {
      return cachedOffline;
    }

    return caches.match("/");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    void networkResponsePromise;
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;

  if (networkResponse) {
    return networkResponse;
  }

  return new Response(JSON.stringify({ error: "offline" }), {
    headers: { "Content-Type": "application/json" },
    status: 503,
    statusText: "Service Unavailable",
  });
}
