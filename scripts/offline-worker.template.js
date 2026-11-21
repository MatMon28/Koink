/*
 * Koink offline worker (browser / PWA only; the Android app loads its files from the APK).
 *
 * This is a template. vite.config.ts fills in the two tokens below when `npm run build` finishes
 * and writes the result to dist/offline-worker.js, so every build precaches exactly its own files
 * under its own cache name. Edit this file, never the generated one. See docs/pwa.md.
 */
const BUILD = '__BUILD_ID__';
const PRECACHE = ['__PRECACHE__'];

const PREFIX = 'koink-shell-';
const CACHE = PREFIX + BUILD;
const SCOPE = self.registration.scope;
const SHELL = new URL('./', SCOPE).href;
const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add(new Request(SHELL, { cache: 'reload' }));
    await Promise.all(PRECACHE.map(async (file) => {
      const url = new URL(file, SCOPE).href;
      try {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        // Some hosts answer a missing file with index.html and HTTP 200. Never keep that as an asset.
        if (!response.ok || isHtml(response)) throw new Error(`${file}: ${response.status}`);
        await cache.put(url, response);
      } catch (error) {
        // Without its scripts, styles and fonts the app cannot start offline: fail the install so the
        // browser tries again later. A missing icon or manifest must not block it.
        if (file.startsWith('assets/')) throw error;
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Older builds of this app, including those from before it was renamed (koins-shell-*).
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
  // The project archive and the brand sheet are plain files: the browser fetches them itself. They
  // are never cached here, and the brand sheet's page must never be stored as the app shell.
  if (url.href.startsWith(new URL('downloads/', SCOPE).href) || url.href.startsWith(new URL('brand/', SCOPE).href)) return;

  // Opening the app: the network first (so a new version is picked up), the saved shell when offline.
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

  // Everything else (hashed scripts, styles, fonts, icons): the cache first, the network as a fallback.
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

// A tap on a reminder this worker showed (src/lib/notifications.ts): bring Koink to the front and
// tell it what to open. With no window left, open one on `?open=<target>`.
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
    await self.clients.openWindow(new URL(target ? `./?open=${encodeURIComponent(target)}` : './', SCOPE).href);
  })());
});
