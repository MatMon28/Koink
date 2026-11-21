/*
 * Koink offline worker (browser / PWA only; the Android app loads its files from the APK).
 *
 * When built with Koink's vite.config.ts, `offlineWorker()` replaces this file in dist/ with the
 * hashed build-specific worker from scripts/offline-worker.template.js. In single-file builds,
 * this worker precaches the shell, manifest and icons directly. See docs/pwa.md.
 */
const PREFIX = 'koink-shell-';
const CACHE = `${PREFIX}v2`;
const SCOPE = self.registration.scope;
const SHELL = new URL('./', SCOPE).href;
const PWA_ASSETS = [
  'favicon.svg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
].map((file) => new URL(file, SCOPE).href);

const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add(new Request(SHELL, { cache: 'reload' }));
    await Promise.all(
      PWA_ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })).catch(() => undefined)),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = (key) => (key.startsWith(PREFIX) || key.startsWith('koins-shell-')) && key !== CACHE;
    await Promise.all(keys.filter(old).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (url.href.startsWith(new URL('downloads/', SCOPE).href) || url.href.startsWith(new URL('brand/', SCOPE).href)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && isHtml(response)) await cache.put(SHELL, response.clone());
        return response;
      } catch {
        return (await cache.match(SHELL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request.url);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && !isHtml(response)) {
      try {
        await cache.put(request.url, response.clone());
      } catch {
        /* A full cache must not break this request. */
      }
    }
    return response;
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.target;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find((candidate) => candidate.url.startsWith(SCOPE));
    if (client) {
      await client.focus().catch(() => undefined);
      client.postMessage({ type: 'koink:open', target });
      return;
    }
    await self.clients.openWindow(new URL(target ? `./?view=app&open=${encodeURIComponent(target)}` : './?view=app', SCOPE).href);
  })());
});
