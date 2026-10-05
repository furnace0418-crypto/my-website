const CACHE_PREFIX = "taoyuan-desktop-";
// New image formats use a fresh cache; discard stale PNG/JPEG entries.
const CACHE_NAME = `${CACHE_PREFIX}20261005-2`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const canStore = (request, response) => (
  request.method === "GET" &&
  !request.headers.has("range") &&
  response?.ok &&
  response.type === "basic"
);

async function updateCache(request) {
  const response = await fetch(request, { cache: "no-cache" });
  if (canStore(request, response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function cacheFirstAndRefresh(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const refreshed = updateCache(event.request);
  if (cached) {
    event.waitUntil(refreshed.catch(() => {}));
    return cached;
  }
  return refreshed;
}

async function cacheFirstImage(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  return cached || updateCache(request);
}

async function networkFirst(request) {
  try {
    return await updateCache(request);
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The user-selected ZIP is the durable copy; do not duplicate it in Cache Storage.
  if (/desktop-assets-[^/]+\.zip$/i.test(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" || /\.(?:css|js)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Images in the preload manifest are fetched again as Image elements.
  // Reuse the cached bytes without starting a second background download.
  if (request.destination === "image" || /\.(?:png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  event.respondWith(cacheFirstAndRefresh(event));
});
