/* RL-Guide-book Service Worker
   Goals:
   - Speed up repeat visits (cache JS/CSS/assets + images)
   - Keep updates safe (HTML is network-first; data is stale-while-revalidate)
   - Respect subpath deployments (/RL-Guide-book/)
*/

const VERSION = 'v4';
const CACHE_HTML = `rlgb-html-${VERSION}`;
const CACHE_ASSETS = `rlgb-assets-${VERSION}`;
const CACHE_IMAGES = `rlgb-images-${VERSION}`;
const CACHE_DATA = `rlgb-data-${VERSION}`;

const MAX_IMAGES = 240;
const MAX_ASSETS = 120;
const MAX_DATA = 120;

const getScopePath = () => {
  try {
    return new URL(self.registration.scope).pathname.replace(/\/+$/, '/') || '/';
  } catch {
    return '/';
  }
};

const withinScope = (url) => {
  const scopePath = getScopePath();
  return url.pathname.startsWith(scopePath);
};

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - maxEntries;
  if (extra <= 0) return;
  // Drop oldest entries (FIFO). Good enough for our use.
  for (let i = 0; i < extra; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', (event) => {
  // We rely mostly on runtime caching because Vite assets are hashed.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cleanup old cache versions
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith('rlgb-') && !k.endsWith(VERSION)) return caches.delete(k);
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isAssetRequest(url) {
  return (
    url.pathname.includes('/assets/') &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
  );
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname);
}

function isAiDataRequest(url) {
  return url.pathname.includes('/ai-data/') && /\.(json|md)$/i.test(url.pathname);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('network-first-failed');
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
    if (typeof maxEntries === 'number') await trimCache(cacheName, maxEntries);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        cache.put(request, res.clone());
        if (typeof maxEntries === 'number') return trimCache(cacheName, maxEntries).then(() => res);
      }
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || (await fetch(request));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!withinScope(url)) return;

  // HTML: keep updates safe.
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request, CACHE_HTML));
    return;
  }

  // Hashed JS/CSS bundles: cache-first.
  if (isAssetRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS, MAX_ASSETS));
    return;
  }

  // AI data: stale-while-revalidate (fast + updates).
  if (isAiDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DATA, MAX_DATA));
    return;
  }

  // Images: cache-first.
  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES, MAX_IMAGES));
    return;
  }
});
