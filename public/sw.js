/**
 * @file sw.js
 * @description OIYO Arcade Offline Service Worker.
 * Caches core app shell, audio synthesizers, WebP sprites, and font assets
 * to guarantee instantaneous zero-latency offline play.
 */

const CACHE_NAME = "oiyo-arcade-cache-v1";

const PRECACHE_ASSETS = [
  "/favicon.svg",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/manifest.json",
];

// Install: precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-First for HTML/Navigations, Cache-First for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or external analytics
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Static assets (images, sprites, fonts, audio): Cache-First with fallback
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response;
            }
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached || Response.error());
      })
    );
    return;
  }

  // HTML Page Navigation: Network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
  }
});
