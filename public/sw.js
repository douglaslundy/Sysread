/* global self, caches, fetch */

const SHELL_CACHE = "readcoach-shell-v1";
const RUNTIME_CACHE = "readcoach-runtime-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

const PUBLIC_NAVIGATIONS = new Set([
  "/pricing",
  "/privacy",
  "/terms",
  OFFLINE_URL,
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.has("authorization")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url.pathname));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function handleNavigation(request, pathname) {
  try {
    const response = await fetch(request);

    if (response.ok && PUBLIC_NAVIGATIONS.has(pathname)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    if (PUBLIC_NAVIGATIONS.has(pathname)) {
      const cachedPage = await caches.match(request);
      if (cachedPage) return cachedPage;
    }

    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}