const CACHE_PREFIX = "taoyuan-desktop-";
const CACHE_NAME = `${CACHE_PREFIX}20260926-1`;

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
  const response = await fetch(request);
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

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirstAndRefresh(event));
});
