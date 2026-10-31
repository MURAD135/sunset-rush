/* Sunset Rush offline PWA — manual, script-free Windows setup.
   Third-party code is cached from its original source when first online.
   Increment VERSION when releasing changed app files. */
const VERSION = 'manual-pwa-1.0.0';
const CACHE_NAME = `sunset-rush-${VERSION}`;
const PREFIX = 'sunset-rush-';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
const EXTERNAL_JS = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const EXTERNAL_CSS = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@500;800&display=swap';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS.map(p => new URL(p, self.registration.scope).href));
    // Core 3D runtime must be cached; otherwise offline installation is incomplete.
    const js = await fetch(EXTERNAL_JS, { mode: 'no-cors', cache: 'reload' });
    if (!js || (js.type !== 'opaque' && !js.ok)) {
      throw new Error('Unable to cache Three.js for offline play');
    }
    await cache.put(EXTERNAL_JS, js);
    // Fonts are optional; native font fallback keeps the game usable offline.
    try {
      const css = await fetch(EXTERNAL_CSS, {mode: 'no-cors'});
      if (css && (css.type === 'opaque' || css.ok)) await cache.put(EXTERNAL_CSS, css);
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(PREFIX) && n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  const inApp = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  const fromExternal = url.href.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/') ||
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!inApp && !fromExternal) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (!fresh.ok) throw new Error('Navigation error');
        // Do not mix an unversioned fresh HTML with a stale app shell in the offline cache.
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) || (await cache.match(new URL('./index.html', scope).href)) || Response.error();
      }
    })());
  } else {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response.ok || response.type === 'opaque') event.waitUntil(cache.put(req, response.clone()));
        return response;
      } catch (_) {
        return Response.error();
      }
    })());
  }
});
