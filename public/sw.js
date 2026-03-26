const CACHE_NAME = "lalibreta-v2";

// Install: skip waiting immediately to activate new SW
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: clean ALL old caches and take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: Network-first for EVERYTHING
// Only fall back to cache when offline
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin))
    return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache
        return caches
          .match(request)
          .then((cached) => cached || caches.match("/"));
      }),
  );
});
