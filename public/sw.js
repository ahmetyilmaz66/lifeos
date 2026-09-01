const CACHE_NAME = "lifeos-static-v1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Deliberately no response caching for pages/API calls: this app is auth-gated
// and shows financial data, which must always be fresh rather than served stale.
// The empty handler still satisfies installability (a service worker must control
// fetches) without changing any request's behavior.
self.addEventListener("fetch", () => {});
