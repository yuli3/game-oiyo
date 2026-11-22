/**
 * game.oiyo.net service worker (v2, 2026-11-22).
 *
 * What it does
 * - Pages: network first (6 s), then the cached copy, then /offline.html.
 *   Only the last 60 pages are kept.
 * - /_astro/* and /fonts/*: content-hashed, so cache first (last 300 kept).
 * - Images, sprites, audio, game data: stale-while-revalidate (last 300 kept),
 *   so updated art shows up on the next visit instead of never.
 * - Unity WebGL builds (/prototypes/*-unity/, about 6 MB each) are NEVER cached
 *   automatically. They are cached only when the player presses "Save for
 *   offline" (src/lib/pwa/offline-unity.ts writes the files into the
 *   oiyo-unity-v1 cache from the page). A saved build is then served from that
 *   cache: online with a conditional request (304 = cached copy, 200 = new
 *   build, which replaces the cached file), offline straight from cache.
 * - Anything cross-origin (AdSense, Google Analytics, CDNs) and /api/* is not
 *   touched at all, so ads and analytics behave exactly as without a worker.
 *
 * Responses are stored without their "redirected" flag: Cloudflare Pages
 * strips ".html" with a 308, and a redirected response cannot answer a
 * navigation.
 */

const VERSION = "v2";
const CORE = `oiyo-core-${VERSION}`;
const STATIC = `oiyo-static-${VERSION}`;
const MEDIA = `oiyo-media-${VERSION}`;
const PAGES = `oiyo-pages-${VERSION}`;
const UNITY = "oiyo-unity-v1"; // kept across worker versions: the player chose to save these
const KEEP = new Set([CORE, STATIC, MEDIA, PAGES, UNITY]);
const LIMITS = { [STATIC]: 300, [MEDIA]: 300, [PAGES]: 60 };
const OFFLINE_URL = "/offline.html";
const NAV_TIMEOUT_MS = 6000;

const CORE_ASSETS = [
  OFFLINE_URL,
  "/favicon.svg",
  "/favicon-32x32.png",
  "/icon-192.png",
  "/pwa/icon-maskable-192.png",
  "/apple-touch-icon.png",
];

const UNITY_RE = /^\/prototypes\/(?:[a-z0-9-]+-unity\/|unity-frame-bridge\.js$)/;
const MEDIA_RE = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp3|ogg|wav|m4a|json|woff2?)$/i;
const SCRIPT_RE = /\.(js|mjs|css)$/i;

// ── helpers ────────────────────────────────────────────────

/** Copy a response so it is storable and usable for any request mode. */
async function clean(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function storable(response) {
  return Boolean(response && response.ok && response.status === 200 && response.type === "basic");
}

async function put(cacheName, key, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, await clean(response));
    const limit = LIMITS[cacheName];
    if (limit) await trim(cache, limit);
  } catch {
    /* quota or opaque body: caching is best effort */
  }
}

/** Keep the newest `limit` entries (cache.keys() lists in insertion order). */
async function trim(cache, limit) {
  const keys = await cache.keys();
  const extra = keys.length - limit;
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

function pageKey(url) {
  // Query strings (utm_*, ?source=pwa, ?play=quick) do not change the page.
  return url.origin + url.pathname;
}

// ── lifecycle ──────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((path) =>
          fetch(path, { cache: "reload" })
            .then((res) => (storable(res) ? clean(res).then((c) => cache.put(path, c)) : undefined))
            .catch(() => undefined),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !KEEP.has(key)).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* optional */
        }
      }
      await self.clients.claim();
    })(),
  );
});

// The page sends the same-origin URLs it already loaded before this worker
// controlled it (first visit), so a game played once also opens offline.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "oiyo:warm" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      for (const raw of data.urls.slice(0, 120)) {
        let url;
        try {
          url = new URL(raw, self.location.origin);
        } catch {
          continue;
        }
        if (url.origin !== self.location.origin) continue;
        const route = routeFor(url, false);
        if (!route) continue;
        const key = route === PAGES ? pageKey(url) : url.href;
        const cache = await caches.open(route);
        if (await cache.match(key)) continue;
        try {
          const res = await fetch(url.href, { credentials: "same-origin" });
          if (storable(res)) await put(route, key, res);
        } catch {
          /* offline: skip */
        }
      }
    })(),
  );
});

// ── routing ────────────────────────────────────────────────

/** Which cache a same-origin URL belongs to, or null to leave it alone. */
function routeFor(url, isNavigation) {
  const path = url.pathname;
  if (path.startsWith("/api/") || path.startsWith("/cdn-cgi/") || path === "/sw.js") return null;
  if (UNITY_RE.test(path)) return null; // only via the explicit offline save
  if (path.startsWith("/_astro/") || path.startsWith("/fonts/")) return STATIC;
  if (isNavigation || path.endsWith("/") || path.endsWith(".html")) return PAGES;
  if (MEDIA_RE.test(path)) return MEDIA;
  if (SCRIPT_RE.test(path)) return MEDIA; // un-hashed prototype engines: revalidate in background
  return null;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ads, analytics, CDNs: untouched
  if (request.headers.has("range")) return; // media seeking

  const isNavigation = request.mode === "navigate";

  if (UNITY_RE.test(url.pathname)) {
    event.respondWith(unity(request, url, event));
    return;
  }

  const route = routeFor(url, isNavigation);
  if (!route) return;
  if (route === PAGES) {
    if (isNavigation) event.respondWith(page(event, url));
    return;
  }
  if (route === STATIC) event.respondWith(cacheFirst(request, STATIC));
  else event.respondWith(staleWhileRevalidate(event, request, MEDIA));
});

async function page(event, url) {
  const key = pageKey(url);
  const network = (async () => {
    const preloaded = await event.preloadResponse;
    return preloaded || fetch(event.request);
  })();
  // Store the fresh copy even when the cached one answered first (slow network).
  event.waitUntil(
    network.then((res) => (storable(res) ? put(PAGES, key, res.clone()) : undefined)).catch(() => undefined),
  );

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
  } catch {
    // PAGES first, then any cache (a page saved with a Unity build lives in oiyo-unity-v1).
    const cached = (await caches.match(key, { cacheName: PAGES })) || (await caches.match(key));
    if (cached) return cached;
    try {
      return await network; // slow but alive: keep waiting rather than show offline
    } catch {
      return (await caches.match(OFFLINE_URL, { cacheName: CORE })) || Response.error();
    }
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (storable(res)) await put(cacheName, request, res.clone());
    return res;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  const network = fetch(request)
    .then(async (res) => {
      if (storable(res)) await put(cacheName, request, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || (await caches.match(request)) || Response.error();
}

/** Unity build files: pass through unless the player saved this build. */
async function unity(request, url, event) {
  const cache = await caches.open(UNITY);
  const isIndex = request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  const key = isIndex ? url.pathname.replace(/\/(index\.html)?$/, "/index.html") : url.pathname;
  const cached = await cache.match(new URL(key, url.origin).href);
  if (!cached) {
    const preloaded = isIndex ? await event.preloadResponse : undefined;
    return preloaded || fetch(request);
  }

  // Saved build: ask the server whether the file changed (cheap 304), so a
  // rebuild never pairs a new loader with old data. Offline: use the copy.
  const headers = new Headers();
  const etag = cached.headers.get("etag");
  const modified = cached.headers.get("last-modified");
  if (etag) headers.set("if-none-match", etag);
  else if (modified) headers.set("if-modified-since", modified);
  try {
    const res = await fetch(isIndex ? url.href : request.url, { headers, cache: "no-store", credentials: "same-origin" });
    if (res.status === 304) return cached;
    if (storable(res)) {
      await cache.put(new URL(key, url.origin).href, await clean(res.clone()));
      return clean(res);
    }
    return cached;
  } catch {
    return cached;
  }
}
