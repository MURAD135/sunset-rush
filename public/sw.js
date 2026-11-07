/* Versioned, same-origin production bundle; no CDN runtime dependency. */
const CACHE = 'sunset-rush-__BUILD_ID__';
const ASSETS = /*__ASSETS__*/ [];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // A new version waits until the previous game's tabs close.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('sunset-rush-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});
